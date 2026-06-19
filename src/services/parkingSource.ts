/**
 * Parking data source abstraction.
 *
 * PRIMARY SOURCE — Munich open-data CSV (static, pre-generated):
 *   Run: npm run generate:parking path/to/munich_open_data_portal.csv
 *   Output: src/data/munich_parking.ts
 *   The generated file is committed so the app works offline with no API calls.
 *
 * FUTURE / OPTIONAL — Google Places API enrichment:
 *   Places generally does NOT provide live parking occupancy (available spaces
 *   right now). It can provide place details, photos, and opening hours for
 *   named car parks, but NOT on-street curb space availability.
 *
 *   If Places enrichment is ever added:
 *   - It MUST run server-side (Cloud Function, edge route, etc.).
 *   - The Places API server key must NEVER be bundled in the Expo app.
 *   - Use EXPO_PUBLIC_* only for the Maps SDK display keys (not Places).
 *   - The app calls your own backend endpoint, which calls Places and returns
 *     sanitised results — keeping the secret key off the device.
 */

export { parkingData } from '@/data/munich_parking';
export type { ParkingEntry } from '@/data/munich_parking';
