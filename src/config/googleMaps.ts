// Public Expo env vars are bundled into the client. Restrict this key in
// Google Cloud Console; use a backend proxy for production secret handling.
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export function getGooglePlacesApiKey() {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error(
      'Google Places API key is missing. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY.',
    );
  }

  return GOOGLE_PLACES_API_KEY;
}
