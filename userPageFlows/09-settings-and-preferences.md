# Settings, Preferences, and Informational Pages

## Flow 1: View live app data

Open `YOU` and scroll to `Your app data`.

### `View favorites`

- Shows the device favorite count on the row.
- Tap -> `/favorites`; signed-in users return to the map with Favorites open, while signed-out users return to the map with the account prompt.

### `Location permission`

- Shows current permission label and description.
- Tap -> operating-system Settings.
- It is disabled while permission status is loading.
- A status-read error appears in a retry panel above this section.

### `Storage & local data`

- Tap -> `/account/local-data`.
- Opens the two-step clear-local-data flow.

## Flow 2: Toggle implemented preference storage

Open `YOU` and scroll to `Preferences`.

The following switches can be toggled and saved locally:

- Notifications
- Parking reminders
- Haptic feedback
- Product analytics consent preference
- Crash reporting consent preference

For every switch:

1. Tap the switch/row control.
2. The value changes immediately in the UI.
3. The preference provider writes the new value to device storage.
4. A storage failure shows an error panel with `Retry` above the section.

Important visible limitations:

- Notification/reminder switches save preferences only; notification permission and delivery are not implemented here.
- Analytics and crash reporting switches save consent preferences only; no analytics or crash SDK is installed.

## Flow 3: Disabled future preference

`Dark mode` is disabled, marked `Future`, and explains that theme switching will be connected later. The user can see it but cannot toggle it.

## Flow 4: Language and units

1. Tap `Language` or `Units`.
2. `/account/preferences` opens.
3. The user sees a connected placeholder page explaining that language, units, and appearance are represented in the model but full controls are not implemented.
4. Tap `Back` to return to the account page.

The account list currently shows `System` for language and the stored `Metric`/`Imperial` label for units, but the placeholder page does not provide controls to change them.

## Flow 5: Support pages

### Help & support

1. Tap `Help & support`.
2. `/account/help` opens.
3. The page says approved support contact and troubleshooting content are not yet connected.

### Notification settings

1. Tap `Notification settings`.
2. `/account/notifications` opens.
3. The page explains that preferences are stored locally and full permission/delivery is outside the current implementation.

Both pages use a shared `Back` control and show `Foundation ready` placeholder content.

## Flow 6: Legal and about pages

### Privacy & data

- Opens `/account/privacy`.
- Explains that policy content, consent withdrawal, and location-permission controls will be connected later.

### About

- Opens `/account/about`.
- Shows configured app name and version, plus native build number/version code when available.

### Open-source licenses

- Opens `/account/licenses`.
- Explains that generated third-party acknowledgements are not added yet.

Each page has a `Back` pill. When there is no route history, Back replaces the route with `/account`.

## Flow 7: Membership and purchase controls

- The membership card displays Free, Premium, Lifetime, or Membership unavailable status.
- Its action is currently disabled and reads `Coming later`.
- `Restore purchases` is disabled and marked `Future`.
- The signed-in `Membership` item is removed from the rendered quick-action list, so it is not currently clickable from `YOU`.

The separate `/billing` route exists as a secondary/deep-link page; see the secondary-routes document.

