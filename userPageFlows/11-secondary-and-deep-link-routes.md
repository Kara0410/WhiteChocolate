# Secondary and Deep-Link Routes

These routes exist and can be opened by links/router calls, but they are not all exposed by the current primary bottom navigation.

## `/list`

1. Opens the Parking list overlay through context.
2. Immediately redirects to `/map`.
3. The user sees the `Parking nearby` bottom sheet described in the parking discovery flow.

## `/favorites`

1. Waits for account state.
2. Signed-in -> opens Favorites and redirects to `/map`.
3. Signed-out -> opens the account prompt and redirects to `/map`.

## `/parking/[id]`

This is a standalone legacy-style parking-segment detail route, separate from the current map bottom-sheet detail.

### Loading

- Header title: `Parking details`.
- Centered spinner and `Loading parking details...`.

### Not found

- Shows `Parking segment not found.`

### Error

- Shows the normalized fetch error message.

### Success

1. Header shows street/area title.
2. A native map and marker appear on iOS/Android when coordinates are valid.
3. Web or missing native map shows a panel that opens OpenStreetMap when coordinates exist, or `No location data` otherwise.
4. The detail card shows regulation group, regulation description, optional district, capacity, and coordinates.
5. On web, a second `Open in OpenStreetMap` button appears below the detail card.

## `/billing`

1. Shows `Pilot subscription` and `Unlock full prediction confidence.`
2. Displays a Munich pilot price of `€6 per month` and feature list.
3. `Back to map` returns through router history.
4. `Sign in and continue to Stripe` is visually clickable but has no `onPress` handler, so it currently performs no action.
5. Checkout, cancellation portal, and decline behavior are explanatory copy only in the current implementation.

## `/fresh-check`

1. Opens as a transparent/fade modal route.
2. Shows `Parking estimate`, `Refresh from the map`, and an explanation that estimates come from time, rules, and area demand rather than a live driver report.
3. Tap `Back to map` to close through router history.

## `/auth/callback`, `/auth/forgot-password`, `/auth/reset-password`

These remain reachable even before onboarding hydration so native browser handoffs and recovery links can complete. Their flows are documented in the password/auth-callback document.

## `+not-found`

An unknown route opens the Expo Router not-found page with a link back toward the app root.

## Prepared but currently unmounted UI

`ConsentModal` provides a location pre-permission explanation with `Continue to OS prompt` and `Not now`, but no active route/component currently renders it. It is not counted as a reachable screen until mounted.

