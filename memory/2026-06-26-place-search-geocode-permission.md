# Place Search Geocode Permission

## Symptom

Android logged:

`Unable to search places [Error: Call to function 'ExpoLocation.geocodeAsync' has been rejected. Caused by: Not authorized to use location services]`

## Root Cause

The new place search hook called `Location.geocodeAsync` directly. Expo Location requires foreground location permission before Android geocoding can be used.

## Fix

- `src/hooks/use-place-search.ts` now checks and requests foreground permission on Android before calling `geocodeAsync`.
- Expected authorization failures are surfaced as a friendly search error instead of a development warning.
- `app.config.ts` now includes the `expo-location` config plugin with a specific when-in-use permission message.

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:clustering`

All passed.

## Status

DONE_WITH_CONCERNS: Native permission prompt behavior still needs Android device verification.
