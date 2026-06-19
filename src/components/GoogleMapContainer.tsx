// ─────────────────────────────────────────────────────────────────────────────
// GoogleMapContainer.tsx — Google Maps with parking area overlays
//
// VISUAL MODEL:
//   Each parking spot is rendered as a semi-transparent coloured Circle whose:
//   • colour   = parking type (via getBadgeColor, same as list-screen badges)
//   • radius   = loosely proportional to space count (30–100 m), 40 m default
//   • opacity  = 0.35 fill / 0.8 stroke — soft enough to see map underneath
//
//   This replaces the dot-marker approach with area overlays that convey both
//   location and approximate zone extent, matching how real parking zones look.
//
// INTERACTION:
//   Clicking any Circle opens an InfoWindow centred on that spot with:
//   street name, district, type badge, space count, and a "View Details" CTA.
//
// LOCATION INDICATORS (OverlayView-based DOM elements):
//   • userLocation  → Google Maps-style blue dot with accuracy halo
//   • searchLocation → gold teardrop pin (circle head + stem + tip)
//
// RADIUS:
//   The large radius Circle (gold tint) shows the active search area.
//   Only spots within radiusKm of activeCenter are rendered — see visibleMarkers.
//
// PROPS:
//   parkingData    — chip-filtered list from map.tsx
//   onMarkerClick  — navigate to /parking/[id]
//   userLocation   — GPS fix → blue dot
//   searchLocation — searched place → gold pin
//   radiusKm       — km; always active when a centre exists
//   isLoaded       — passed from parent (map.tsx owns useLoadScript)
//   loadError      — non-null if SDK failed
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Circle, InfoWindow, OverlayView } from '@react-google-maps/api';
import { getBadgeColor, type DisplayEntry } from '@/utils/parking';
import { haversine } from '@/utils/geo';

// ─── Constants ────────────────────────────────────────────────────────────────

const MUNICH_CENTER = { lat: 48.1351, lng: 11.5824 };
const ZOOM_WITH_LOCATION = 15; // street level — parking areas clearly visible
const ZOOM_DEFAULT       = 12;

// Inject once into the page so Google Maps InfoWindows fade+slide in.
// Uses a CSS animation targeting the Maps SDK's internal class names.
function injectInfoWindowCSS() {
  if (typeof document === 'undefined') return;
  const id = 'gm-iw-anim';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .gm-style-iw-c {
      animation: gmFadeUp 0.2s cubic-bezier(0.22, 1, 0.36, 1) !important;
    }
    @keyframes gmFadeUp {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    .gm-style-iw-c, .gm-style-iw-d {
      background-color: #2d3238 !important;
      border-radius: 12px !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .gm-style-iw-tc::after { background: #2d3238 !important; }
    .gm-ui-hover-effect span { background-color: #9ca3af !important; }
    .gm-ui-hover-effect { top: 4px !important; right: 4px !important; }
  `;
  document.head.appendChild(style);
}

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'all',       elementType: 'labels',          stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry',        stylers: [{ color: '#1e2227' }] },
  { featureType: 'road',      elementType: 'geometry',        stylers: [{ color: '#2d3238' }] },
  { featureType: 'road',      elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
  { featureType: 'water',     elementType: 'geometry',        stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi.park',  elementType: 'geometry',        stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'poi',       stylers:                        [{ visibility: 'off' }] },
  { featureType: 'transit',   stylers:                        [{ visibility: 'off' }] },
];

// Radius search area circle — subtle gold ring, not a filled shape
const RADIUS_CIRCLE_OPTIONS: google.maps.CircleOptions = {
  fillColor:     '#ffd33d',
  fillOpacity:   0.03,
  strokeColor:   '#ffd33d',
  strokeOpacity: 0.3,
  strokeWeight:  1.5,
  clickable:     false,
  zIndex:        0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Map a space count to a circle radius in metres.
// Unknown (0) → 40 m; scales up to 100 m for very large lots.
function parkingRadius(angebot: number): number {
  if (angebot <= 0) return 40;
  return Math.max(30, Math.min(100, angebot * 1.5));
}

// Build Circle options for a parking area — colour from badge, semi-transparent.
function areaCircleOptions(color: string): google.maps.CircleOptions {
  return {
    fillColor:     color,
    fillOpacity:   0.35,
    strokeColor:   color,
    strokeOpacity: 0.8,
    strokeWeight:  2,
    clickable:     true,
    zIndex:        2,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  parkingData:    DisplayEntry[];
  onMarkerClick:  (item: DisplayEntry) => void;
  userLocation:   { lat: number; lng: number } | null;
  searchLocation: { lat: number; lng: number } | null;
  radiusKm:       number;
  isLoaded:       boolean;
  loadError:      Error | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GoogleMapContainer({
  parkingData,
  onMarkerClick,
  userLocation,
  searchLocation,
  radiusKm,
  isLoaded,
  loadError,
}: Props) {

  const [selectedItem, setSelectedItem] = useState<DisplayEntry | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Searched location takes priority over GPS as the radius centre.
  const activeCenter = searchLocation ?? userLocation;

  // Smoothly pan the map whenever the active centre changes.
  // We use the imperative panTo() API instead of the center prop so Google Maps
  // plays its built-in eased animation rather than jumping instantly.
  useEffect(() => {
    if (!mapRef.current || !activeCenter) return;
    mapRef.current.panTo(activeCenter);
    const current = mapRef.current.getZoom() ?? ZOOM_DEFAULT;
    if (current < ZOOM_WITH_LOCATION) {
      // Step zoom in one tick after the pan starts so it feels sequential
      setTimeout(() => mapRef.current?.setZoom(ZOOM_WITH_LOCATION), 120);
    }
  }, [activeCenter]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    injectInfoWindowCSS();
    // If a centre is already known (e.g. default location geocoded before map loaded)
    // jump there immediately — no animation needed on first load.
    if (activeCenter) {
      map.setCenter(activeCenter);
      map.setZoom(ZOOM_WITH_LOCATION);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Radius filtering ───────────────────────────────────────────────────────
  const visibleMarkers = useMemo(() => {
    return parkingData.filter(item => {
      if (!item.lat || !item.lon) return false;
      if (!activeCenter) return true;
      const metres = haversine(activeCenter.lat, activeCenter.lng, item.lat, item.lon);
      return metres <= radiusKm * 1_000;
    });
  }, [parkingData, activeCenter, radiusKm]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAreaClick = useCallback((item: DisplayEntry) => {
    setSelectedItem(item);
  }, []);

  const handleInfoClose = useCallback(() => setSelectedItem(null), []);

  const handleViewDetails = useCallback((item: DisplayEntry) => {
    setSelectedItem(null);
    onMarkerClick(item);
  }, [onMarkerClick]);

  // ── Loading / error states ────────────────────────────────────────────────

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', backgroundColor: '#25292e' }}>
        <p style={{ color: '#ef4444', fontSize: 14 }}>
          Failed to load Google Maps: {loadError.message}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', backgroundColor: '#25292e' }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading map…</p>
      </div>
    );
  }

  // ── Map render ────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={MUNICH_CENTER}
        zoom={ZOOM_DEFAULT}
        onLoad={onMapLoad}
        options={{
          mapTypeControl:     false,
          fullscreenControl:  false,
          streetViewControl:  false,
          zoomControl:        true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          gestureHandling:    'greedy',
          styles:             DARK_MAP_STYLE,
        }}
      >

        {/* ── Radius search area ring ─────────────────────────────────────── */}
        {activeCenter && (
          <Circle
            center={activeCenter}
            radius={radiusKm * 1_000}
            options={RADIUS_CIRCLE_OPTIONS}
          />
        )}

        {/* ── Parking area circles ────────────────────────────────────────── */}
        {/* Each spot is a semi-transparent filled circle sized by capacity.  */}
        {/* Colour matches the type badge used in the list screen.            */}
        {visibleMarkers.map(item => {
          const color = getBadgeColor(item.gruppe);
          return (
            <Circle
              key={item._idx}
              center={{ lat: item.lat!, lng: item.lon! }}
              radius={parkingRadius(item.angebot)}
              options={areaCircleOptions(color)}
              onClick={() => handleAreaClick(item)}
            />
          );
        })}

        {/* ── InfoWindow — opens when a parking area is tapped ────────────── */}
        {selectedItem && selectedItem.lat && selectedItem.lon && (
          <InfoWindow
            position={{ lat: selectedItem.lat, lng: selectedItem.lon }}
            onCloseClick={handleInfoClose}
            options={{ pixelOffset: new google.maps.Size(0, -16), maxWidth: 260 }}
          >
            <div style={{
              backgroundColor: '#2d3238',
              borderRadius: 12,
              padding: '14px 16px',
              minWidth: 210,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              {/* Street */}
              <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {selectedItem.strasse}
              </p>

              {/* District */}
              {selectedItem.prm && (
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#9ca3af' }}>
                  {selectedItem.prm}
                </p>
              )}

              {/* Type badge */}
              <span style={{
                display:         'inline-block',
                padding:         '3px 10px',
                borderRadius:    12,
                fontSize:        11,
                fontWeight:      600,
                backgroundColor: getBadgeColor(selectedItem.gruppe) + '28',
                color:           getBadgeColor(selectedItem.gruppe),
                marginBottom:    10,
              }}>
                {selectedItem.gruppe}
              </span>

              {/* Space count */}
              {selectedItem.angebot > 0 && (
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#9ca3af' }}>
                  {selectedItem.angebot} spaces
                </p>
              )}

              {/* Short description — first sentence only */}
              {selectedItem.beschreibung && (
                <p style={{
                  margin: '0 0 12px',
                  fontSize: 11,
                  color: '#6b7280',
                  lineHeight: '1.5',
                  maxHeight: 52,
                  overflow: 'hidden',
                }}>
                  {selectedItem.beschreibung.split('.')[0].trim()}.
                </p>
              )}

              {/* Distance badge (only when location is active) */}
              {selectedItem.distance && (
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#ffd33d' }}>
                  {selectedItem.distance}
                </p>
              )}

              {/* CTA */}
              <button
                onClick={() => handleViewDetails(selectedItem)}
                style={{
                  width:         '100%',
                  padding:       '8px 0',
                  backgroundColor: '#ffd33d',
                  color:         '#1a1f24',
                  border:        'none',
                  borderRadius:  8,
                  fontSize:      12,
                  fontWeight:    700,
                  cursor:        'pointer',
                  letterSpacing: '0.3px',
                }}
              >
                View Details →
              </button>
            </div>
          </InfoWindow>
        )}

        {/* ── GPS blue dot ─────────────────────────────────────────────────── */}
        {userLocation && (
          <OverlayView
            position={userLocation}
            mapPaneName="floatPane"
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
          >
            <div style={{
              position: 'relative',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute',
                width: 40, height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(66, 133, 244, 0.18)',
              }} />
              <div style={{
                position: 'relative',
                width: 16, height: 16,
                borderRadius: '50%',
                backgroundColor: '#4285f4',
                border: '2.5px solid #ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                zIndex: 1,
              }} />
            </div>
          </OverlayView>
        )}

        {/* ── Gold search pin ──────────────────────────────────────────────── */}
        {/* tip of the pin (bottom) aligns to lat/lng via getPixelPositionOffset */}
        {searchLocation && (
          <OverlayView
            position={searchLocation}
            mapPaneName="floatPane"
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: '50%',
                backgroundColor: '#ffd33d',
                border: '2.5px solid #b8860b',
                boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7a5200' }} />
              </div>
              <div style={{ width: 3, height: 10, backgroundColor: '#b8860b' }} />
              <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#b8860b' }} />
            </div>
          </OverlayView>
        )}

      </GoogleMap>
    </div>
  );
}
