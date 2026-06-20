/**
 * Business-logic helpers for parking data.
 *
 * Kept separate from components so the filter/sort logic can be tested
 * and reasoned about independently of the UI.
 */

import type { ParkingEntry } from '@/data/munich_parking';
import { BADGE_COLORS, FILTER_CHIPS } from '@/constants/parking';
import { haversine } from '@/utils/geo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A ParkingEntry annotated with runtime-computed fields.
 *
 * _idx    — the entry's stable position in the master parkingData array.
 *           Used as the navigation param when opening the detail screen.
 *           Must be derived before any sorting so it always points to the
 *           correct record regardless of the current display order.
 *
 * distance — metres from the user's position. Only set when location mode
 *            is active; undefined otherwise.
 */
export type DisplayEntry = ParkingEntry & {
  _idx: number;
  distance?: number;
};

// ---------------------------------------------------------------------------
// Colour resolver
// ---------------------------------------------------------------------------

/**
 * Returns the accent colour for a parking group string.
 *
 * Uses prefix matching so sub-types (e.g. "Mischparken mit Parkscheibe")
 * still resolve to the parent group's colour.
 * Falls back to neutral grey for any group not explicitly listed.
 */
export function getBadgeColor(gruppe: string): string {
  for (const key of Object.keys(BADGE_COLORS)) {
    if (gruppe.startsWith(key)) return BADGE_COLORS[key];
  }
  return '#6b7280';
}

// ---------------------------------------------------------------------------
// Filter + sort
// ---------------------------------------------------------------------------

type UserLoc = { lat: number; lon: number };

// ---------------------------------------------------------------------------
// Indexed-base cache
// ---------------------------------------------------------------------------

/**
 * Stamps each entry with its original array index, memoized by source-array
 * identity. filterAndSort runs on every keystroke; without this it would clone
 * all ~1,700 entries on each call just to attach _idx. Since parkingData is a
 * stable module-level reference, we compute the stamped array once and reuse it.
 *
 * The cached objects are only ever read downstream (filter returns subsets that
 * share these objects; the distance branch clones before mutating), so reuse is
 * safe — nothing mutates the cache.
 */
let indexedCache: { src: ParkingEntry[]; out: DisplayEntry[] } | null = null;

function indexed(data: ParkingEntry[]): DisplayEntry[] {
  if (indexedCache && indexedCache.src === data) return indexedCache.out;
  const out: DisplayEntry[] = data.map((e, i) => ({ ...e, _idx: i }));
  indexedCache = { src: data, out };
  return out;
}

/**
 * Applies text search, type-filter chips, and optional distance sorting
 * to the full parking dataset.
 *
 * All three filters compose — a result must satisfy every active filter:
 *   1. Text query   → entry fields contain the search string (case-insensitive)
 *   2. Chip filters → entry's group matches at least one selected chip (OR logic)
 *   3. Location     → entries without GPS coords are dropped; rest sorted nearest-first
 *
 * Returns a new array; the source data is never mutated.
 */
export function filterAndSort(
  data: ParkingEntry[],
  query: string,
  activeFilters: Set<string>,
  userLoc: UserLoc | null,
): DisplayEntry[] {
  // Stamp each entry with its original index before any reordering (cached by
  // source identity). This index is the stable navigation key for the detail screen.
  let result: DisplayEntry[] = indexed(data);

  // ── 1. Full-text search ────────────────────────────────────────────────
  if (query.trim()) {
    const q = query.toLowerCase();
    result = result.filter(
      (e) =>
        e.strasse.toLowerCase().includes(q) ||
        e.prm.toLowerCase().includes(q) ||
        e.gruppe.toLowerCase().includes(q),
    );
  }

  // ── 2. Type-filter chips (OR within selection) ─────────────────────────
  if (activeFilters.size > 0) {
    result = result.filter((e) =>
      FILTER_CHIPS.some((f) => activeFilters.has(f.id) && f.match(e.gruppe)),
    );
  }

  // ── 3. Distance sort ───────────────────────────────────────────────────
  // Entries without GPS coordinates are excluded because a distance would
  // be meaningless — they were segments with no extractable LINESTRING coord.
  if (userLoc) {
    result = result
      .filter((e) => e.lat !== null && e.lon !== null)
      .map((e) => ({
        ...e,
        distance: haversine(userLoc.lat, userLoc.lon, e.lat!, e.lon!),
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  return result;
}
