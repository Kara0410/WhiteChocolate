type RadiusBucket = 16 | 32 | 48 | 64;

/**
 * Supercluster radius in screen pixels. The buckets preserve the established
 * density behavior while semantic zoom controls which data reaches the index.
 */
export function getClusterRadiusForZoom(zoom: number): RadiusBucket {
  if (zoom <= 10) {
    return 64;
  }
  if (zoom <= 13) {
    return 48;
  }
  if (zoom <= 15) {
    return 32;
  }
  return 16;
}
