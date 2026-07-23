# Main Map and Primary Navigation

## Flow 1: Enter the map

1. `/` redirects to `/map` after onboarding is complete.
2. While the initial camera/location decision is being resolved, the user sees a centered card with a spinner and `Finding your location...`.
3. Android and iOS then show the native map, parking layers, markers or area summaries, floating location controls, and the bottom navigation.
4. Web shows `Maps are only available on Android and iOS.` in the map area, although surrounding navigation can still render.

## Bottom navigation

### `SEARCH`

- Opens the destination search interface.
- If invoked from an account route, the app returns to `/map` and opens search.
- The normal three-item navigation morphs into a search field.

### `FAVORITES`

- Signed-in user: opens the favorite-parking bottom sheet and returns to `/map` first if necessary.
- Signed-out user: opens the `Create a free account` prompt instead of the favorites list.
- Tapping the active Favorites item again toggles the favorites sheet closed.

### `YOU`

- Closes any map overlay and pushes `/account` unless already on an account route.
- The account route remains visually selected while any `/account/...` subpage is open.

## Flow 2: Tap or pan the map

- Tapping empty map space closes the active overlay if one exists.
- If no overlay is open, tapping empty map space clears selected parking and searched-destination state.
- Manually moving the camera puts the map into a focused-area mode and enables automatic parking fetching.
- When search recommendations are active and the map is moved far enough from the searched destination, `Search this area` appears at the top.

## Flow 3: Use `Search this area`

1. The user has searched for a destination and moved the map more than the refresh threshold.
2. A white floating button reads `Search this area`.
3. Tap it.
4. The button becomes `Searching this area` with a spinner.
5. Parking data refreshes for the visible map center.
6. The nearby-parking sheet updates and ranks results from the new center.
7. Failure is shown inside the nearby-parking sheet, with `Retry` when no results exist or an amber warning when older results remain visible.

## Flow 4: Return to the Munich overview

1. Tap the blue Munich overview control at the lower right.
2. Any overlay, search destination, parking selection, or pending location focus is cleared.
3. The app stops automatic focused-area fetching, clears current parking data, and animates to the full Munich parking overview.
4. The control is marked selected while the map is in Munich-overview mode.
5. Camera failure may produce the internal message `Unable to focus the Munich overview`.

## Flow 5: Android hardware Back

- If Search, Favorites, or the Parking list overlay is open, Back closes that overlay and stays on the map.
- Otherwise, normal router/system back behavior applies.

## Map control visibility rule

The current-location and Munich-overview controls are shown only when:

- no map overlay is open,
- no parking item is selected, and
- no searched destination is selected.

This prevents the controls from overlapping active detail and recommendation sheets.
