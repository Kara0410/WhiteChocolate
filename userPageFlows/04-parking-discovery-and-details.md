# Parking Discovery and Parking Details

## Flow 1: Semantic map exploration

Parking is progressively revealed as the map zoom changes.

1. At the Munich overview, the user sees coarse cells aggregated directly from parking segments.
2. Tap a coarse cell summary to focus that part of the city.
3. At closer zoom, the user sees finer segment-derived cell summaries.
4. Tap a fine cell summary to zoom to segment-cluster level.
5. Tap a cluster marker to zoom in by at least one level and request parking for the tighter camera area.
6. Tap an individual parking marker to select that segment and open parking details.

Invalid-coordinate items do not focus or open.

## Flow 2: Open the parking-nearby list

**Entry:** The `/list` secondary/deep-link route opens the `parking` overlay and redirects to `/map`.

1. The user sees a bottom sheet titled `Parking nearby` and a count of parking areas currently visible in the active map data.
2. Each row shows area name, estimated availability or `Availability unavailable`, and price/free/unavailable copy.
3. Tap a row.
4. The list sheet closes, the map focuses the chosen parking area, and the parking-detail sheet opens.
5. Tap `X`, swipe the sheet down, tap the map, or press hardware Back to close the list.

### List branches

- No current items -> `No parking areas found`.
- Data error with no items -> `Unable to load parking areas`, explanation, and `Retry`.

## Flow 3: Parking detail sheet

1. Tap an individual marker, a parking-list row, a search recommendation, or a favorite.
2. The selected marker is focused above a bottom sheet.
3. The sheet opens at approximately half height and can be dragged between compact, half, and near-full heights.
4. The header shows:
   - parking area name,
   - availability ring or a dash when unknown,
   - `Estimated availability` or `Estimate unavailable`,
   - walking time and distance or `Distance unavailable`,
   - Share, Favorite, and Close controls,
   - `Navigate to spot`.
5. The scrollable body shows:
   - percentage available or `Estimate unavailable`,
   - confidence level,
   - estimate age,
   - pricing,
   - estimated available spaces,
   - total capacity.

## Flow 4: Navigate to a parking area

1. Tap `Navigate to spot`.
2. The app opens the device’s external map/navigation experience for the parking coordinates and label.
3. If navigation cannot be opened, the platform error path is handled by the navigation utility; the detail sheet remains the current app state.

## Flow 5: Share a parking area

1. Tap the Share icon.
2. The native share sheet opens with the parking title, estimated availability or unavailable copy, walking distance, and a Google Maps coordinate link.
3. Cancel/dismiss returns silently to the detail sheet.
4. A non-cancellation failure shows a native alert titled `Sharing unavailable`.

## Flow 6: Add or remove a favorite from details

### Signed-in user

1. Tap the outlined heart to add the area.
2. The heart becomes filled and the item appears in Favorites.
3. Tap the filled heart again to remove it.
4. A storage/refresh failure displays an error panel with `Retry` above the detail content.

### Signed-out user

1. Tap the heart.
2. The favorite is not changed.
3. The `Create a free account` bottom sheet opens.
4. The user may authenticate, continue as guest, or close the prompt.

## Flow 7: Close parking details

The user can tap the header `X`, swipe the sheet down, or tap empty map space. The selection clears, the detail sheet closes, and standard map controls reappear.

## Availability copy rules

- Known percentage -> colored ring and `[N]% available`.
- Unknown or missing percentage -> dash in the ring and `Estimate unavailable`.
- Confidence is currently `Medium confidence`, `Low confidence`, or `Estimate unavailable`.
- Estimate age may be less than a minute, a number of minutes/hours, or unavailable.
- Pricing may be `Free`, `€N.NN / hr`, `Paid · rate unavailable`, or `Pricing unavailable`.
