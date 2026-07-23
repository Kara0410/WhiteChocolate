# Location and Permission Handling

## Flow 1: Center on current location from the map

**Entry condition:** No overlay, selected parking item, or searched destination is active.

1. Tap the white current-location control at the lower right.
2. The button becomes a spinner and is disabled while location is requested.
3. The app closes overlays, clears search and parking selections, and cancels pending camera focus.
4. If coordinates are returned:
   - existing focused parking data is cleared,
   - map mode becomes current-location mode,
   - parking data is requested around the coordinates at a close zoom,
   - the camera focuses the location,
   - a user-location marker appears,
   - the control is marked selected.
5. If focusing fails, the map can surface `Unable to focus the map on your location`.

## Flow 2: First-time operating-system permission

1. The location request calls the platform location permission flow.
2. The operating system displays its native prompt; exact wording depends on Android/iOS and app configuration.
3. Allow -> coordinates are read and the requested onboarding/map action continues.
4. Deny -> no coordinates are returned and a location message is shown.

The reusable `ConsentModal` component contains an app-level pre-permission explanation (`Before location access`, `Continue to OS prompt`, and `Not now`), but no current route mounts this component. Treat it as prepared UI, not a presently reachable user screen.

## Flow 3: Permission denied or services unavailable

1. A dark floating message appears above the map controls with the current location status/error.
2. If the condition requires system settings, an `Open Settings` button is included.
3. Tap `Open Settings` to leave the app for the operating-system settings page.
4. Return to the app and tap the current-location control again to retry.

## Flow 4: Manage location permission from `YOU`

1. Open `YOU`.
2. In `Your app data`, find `Location permission`.
3. The row shows the current permission label and description; it may briefly be disabled while status loads.
4. Tap the row.
5. The system Settings page opens. This account page does not directly request permission.
6. If reading permission status fails, the account page shows an error panel with `Retry`.

## Flow 5: Continue without location

Location is optional. The user can:

- skip it during onboarding,
- dismiss/deny the OS request,
- use destination search manually, and
- return to the Munich overview at any time.

Parking search, map browsing, and parking detail viewing remain available without current-location coordinates.

