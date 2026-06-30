/**
 * Parking data source abstraction.
 *
 * MAP SOURCE - Supabase parking_segments:
 *   The map fetches coordinate-prepared rows by viewport and adapts them to
 *   the existing clustering model. Geometry conversion happens once in SQL.
 *
 * FALLBACK / LIST SOURCE - Munich open-data CSV (static, pre-generated):
 *   Run: npm run generate:parking path/to/munich_open_data_portal.csv
 *   Output: src/data/munich_parking.ts
 *   The generated file remains available for fetch failures and existing
 *   list flows.
 *
 * FUTURE / OPTIONAL - Google Places API enrichment:
 *   Places generally does not provide live parking occupancy. Any enrichment
 *   must run server-side so secret API keys never enter the Expo bundle.
 */

export { parkingData } from '@/data/munich_parking';
export type { ParkingEntry } from '@/data/munich_parking';
