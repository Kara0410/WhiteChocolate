import { getGooglePlacesApiKey } from '@/config/googleMaps';

const PLACES_AUTOCOMPLETE_URL =
  'https://places.googleapis.com/v1/places:autocomplete';
const PLACES_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const AUTOCOMPLETE_FIELD_MASK = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.text.text',
  'suggestions.placePrediction.structuredFormat.mainText.text',
  'suggestions.placePrediction.structuredFormat.secondaryText.text',
].join(',');
const DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,location';

const MUNICH_LOCATION_BIAS = {
  latitude: 48.137154,
  longitude: 11.576124,
  radiusMeters: 50000,
};

export type PlaceSearchSuggestion = {
  id: string;
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
};

export type PlaceSearchResult = {
  id: string;
  placeId: string;
  title: string;
  address?: string;
  latitude: number;
  longitude: number;
};

export type GooglePlaceAutocompleteParams = {
  input: string;
  sessionToken: string;
  locationBias?: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  };
  languageCode?: string;
  regionCode?: string;
  signal?: AbortSignal;
};

type GooglePlacesErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GooglePlacesAutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }[];
};

type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

function googlePlacesHeaders(fieldMask: string) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': getGooglePlacesApiKey(),
    'X-Goog-FieldMask': fieldMask,
  };
}

async function parseGooglePlacesError(response: Response) {
  const errorBody = (await response
    .json()
    .catch(() => ({}))) as GooglePlacesErrorBody;
  const message =
    errorBody.error?.message ||
    errorBody.error?.status ||
    `Google Places request failed with HTTP ${response.status}.`;

  return new Error(message);
}

function hasValidCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

export async function fetchPlaceAutocomplete({
  input,
  sessionToken,
  locationBias = MUNICH_LOCATION_BIAS,
  languageCode = 'de',
  regionCode = 'DE',
  signal,
}: GooglePlaceAutocompleteParams): Promise<PlaceSearchSuggestion[]> {
  const body = {
    input,
    sessionToken,
    languageCode,
    regionCode,
    locationBias: {
      circle: {
        center: {
          latitude: locationBias.latitude,
          longitude: locationBias.longitude,
        },
        radius: locationBias.radiusMeters ?? MUNICH_LOCATION_BIAS.radiusMeters,
      },
    },
  };

  const response = await fetch(PLACES_AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: googlePlacesHeaders(AUTOCOMPLETE_FIELD_MASK),
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw await parseGooglePlacesError(response);
  }

  const data = (await response.json()) as GooglePlacesAutocompleteResponse;

  return (data.suggestions ?? []).reduce<PlaceSearchSuggestion[]>(
    (suggestions, suggestion, index) => {
      const prediction = suggestion.placePrediction;
      const placeId = prediction?.placeId;
      if (!prediction || !placeId) {
        return suggestions;
      }

      const fullText = prediction.text?.text?.trim() || placeId;
      const primaryText =
        prediction.structuredFormat?.mainText?.text?.trim() || fullText;
      const secondaryText =
        prediction.structuredFormat?.secondaryText?.text?.trim();

      suggestions.push({
        id: `${placeId}:${index}`,
        placeId,
        primaryText,
        secondaryText,
        fullText,
      });
      return suggestions;
    },
    [],
  );
}

export async function fetchPlaceDetails({
  placeId,
  sessionToken,
  languageCode = 'de',
  regionCode = 'DE',
  signal,
}: {
  placeId: string;
  sessionToken: string;
  languageCode?: string;
  regionCode?: string;
  signal?: AbortSignal;
}): Promise<PlaceSearchResult> {
  const params = new URLSearchParams({
    languageCode,
    regionCode,
    sessionToken,
  });
  const response = await fetch(
    `${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}?${params.toString()}`,
    {
      headers: googlePlacesHeaders(DETAILS_FIELD_MASK),
      signal,
    },
  );

  if (!response.ok) {
    throw await parseGooglePlacesError(response);
  }

  const data = (await response.json()) as GooglePlaceDetailsResponse;
  const latitude = data.location?.latitude;
  const longitude = data.location?.longitude;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !hasValidCoordinates(latitude, longitude)
  ) {
    throw new Error('Selected place does not include valid coordinates.');
  }

  return {
    id: data.id ?? placeId,
    placeId: data.id ?? placeId,
    title: data.displayName?.text?.trim() || data.formattedAddress || 'Place',
    address: data.formattedAddress,
    latitude,
    longitude,
  };
}
