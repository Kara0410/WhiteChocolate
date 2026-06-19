/**
 * Pure geographic helper functions — no React, no side effects.
 */

/**
 * Haversine formula: great-circle distance between two WGS84 coordinates.
 * Returns the result in metres.
 *
 * Accuracy is ~0.3 %, which is more than sufficient for street-level distances.
 * The formula assumes a perfectly spherical Earth (radius 6 371 km), which
 * introduces a tiny error that is irrelevant at city scale.
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R  = 6_371_000; // Earth's mean radius in metres
  const φ1 = lat1 * (Math.PI / 180);
  const φ2 = lat2 * (Math.PI / 180);
  const Δφ = (lat2 - lat1) * (Math.PI / 180);
  const Δλ = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Converts a raw metre distance to a human-readable string.
 * Below 1 km: "250 m" — above: "1.3 km".
 */
export function fmtDist(metres: number): string {
  return metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(1)} km`;
}
