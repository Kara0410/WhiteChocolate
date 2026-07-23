# Destination Search

## Flow 1: Open search

1. Tap `SEARCH` in the bottom navigation.
2. If necessary, the app returns to `/map`.
3. A dim backdrop covers the map.
4. The dark three-item bottom bar animates into a white search field near the top.
5. The keyboard opens and the field is focused.
6. The initial suggestion panel says `Try an address, landmark, or business name.`

## Flow 2: Enter a query

1. Type into `Search place or address`.
2. The trailing search icon changes to a clear `X` when text exists.
3. While Google Places is queried, the user sees a spinner and `Searching Google Places...`.
4. Successful suggestions appear as rows with a pin icon, primary name, and optional secondary address.
5. The user can tap `X` to clear the query and return to the initial help state.

### Search result branches

- No match after a completed query -> `No places found`.
- Service/configuration/network failure -> the returned error text appears in red.
- During place-detail resolution -> spinner plus `Loading place...`; suggestion rows are disabled.

## Flow 3: Select a place

1. Tap a suggestion row.
2. The keyboard dismisses and the row may show a spinner while place coordinates are resolved.
3. On success, search closes and the backdrop disappears.
4. The map enters focused-area mode, clears the prior selected parking item, and focuses the selected destination above the forthcoming sheet.
5. A destination pin appears with accessibility label `Searched destination`.
6. The `Nearby parking areas` bottom sheet opens for that address/place.

If coordinates are invalid or place resolution fails, no destination is selected and the search error state remains available.

## Flow 4: View nearby recommendations

The sheet shows:

- `Nearby parking areas`
- selected address or place title
- `Showing the closest recommended parking areas` when results exist
- up to five closest results initially
- each result’s availability ring, area name, distance from the destination, price, and navigation icon

### Recommendation states

- Initial load with no results -> spinner, `Finding nearby parking areas`, and `Loading parking data around this destination.`
- No results after load -> `No nearby parking areas found` and `Try a different place or address.`
- Load failure with no results -> `Unable to load parking areas`, explanation, and `Retry`.
- Results plus a refresh error -> results stay visible and an amber warning is shown.
- Results while background refresh runs -> `Updating parking availability` with a spinner.

## Flow 5: Show more or fewer recommendations

1. When more than five recommendations exist, tap `Show more parking areas (N)`.
2. The sheet expands its displayed list up to the first twelve recommendations.
3. The control changes to `Show less`.
4. Tap `Show less` to return to the first five.

## Flow 6: Open a recommended parking area

1. Tap a recommendation row.
2. The selected destination state stays associated with the result, but the recommendation sheet closes.
3. The map focuses the parking marker.
4. The parking-detail bottom sheet opens at its middle snap point.
5. See [Parking discovery and parking details](04-parking-discovery-and-details.md) for available actions.

## Flow 7: Close or cancel search

Search can be closed by:

- tapping the back arrow inside the search field,
- tapping the dim backdrop,
- pressing Android hardware Back, or
- selecting a valid suggestion.

Closing search dismisses the keyboard, clears the query/results state, and restores the normal bottom navigation. Closing the nearby-results sheet clears the selected destination and its recommendation snapshot unless a parking detail is currently selected.

## Flow 8: Search from another page

If `SEARCH` is tapped while the user is on an account page, the router replaces that page with `/map` and then opens the same search experience.

