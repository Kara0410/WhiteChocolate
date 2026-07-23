# User Page Flows

This directory documents what a user can click, what happens next, and what the user sees in every implemented journey in the app.

## How to read these documents

- **Entry condition** explains what must already be true.
- **User action** is the tap, gesture, text entry, system action, or deep link.
- **What the user sees** describes the visible state after the action.
- **Branches and exceptions** cover loading, empty, validation, permission, and error states.
- Routes marked **secondary/deep link** exist in the code but are not exposed by the current primary navigation.
- Development-only controls are called out separately and should not be treated as production user features.

## Primary navigation model

After onboarding, the app opens on `/map`. A floating bottom bar contains three actions:

1. `SEARCH` — opens destination/address search.
2. `FAVORITES` — opens saved parking areas for signed-in users; guests see the account prompt.
3. `YOU` — opens the account and settings page.

The map itself is the main parking browser. Users interact with coarse and fine segment-derived cell summaries, segment clusters, parking markers, search results, current-location controls, and parking detail sheets.

## Flow index

1. [App entry and onboarding](01-app-entry-and-onboarding.md)
2. [Main map and primary navigation](02-main-map-and-primary-navigation.md)
3. [Destination search](03-destination-search.md)
4. [Parking discovery and parking details](04-parking-discovery-and-details.md)
5. [Location and permission handling](05-location-and-permissions.md)
6. [Favorites](06-favorites.md)
7. [Account, sign-in, and registration](07-account-and-authentication.md)
8. [Password recovery and Google callback](08-password-recovery-and-google-callback.md)
9. [Settings, preferences, and informational pages](09-settings-and-preferences.md)
10. [Local-data clearing and account deletion](10-data-clearing-and-account-deletion.md)
11. [Secondary and deep-link routes](11-secondary-and-deep-link-routes.md)
12. [Loading, empty, disabled, and error states](12-state-reference.md)

## High-level user journey

```text
Launch
  -> onboarding loading check
  -> onboarding (first run / reset / old stored version)
     -> welcome
     -> location choice
     -> account choice (signed-out users only)
     -> ready
  -> map
     -> search destination -> nearby recommendations -> parking details
     -> browse map markers -> parking details
     -> current location / Munich overview
     -> favorites -> parking details
     -> You -> account, preferences, support, legal, data controls
```

## Current product boundaries

- Native maps are available only on Android and iOS. Web shows a message instead of the native map.
- Google sign-in is presented in native builds. On web, onboarding explicitly says it is available in the iOS and Android app.
- Premium purchasing, purchase restoration, dark mode, full notification delivery, localization controls, legal content, and support contact are visibly marked as future, unavailable, or placeholder functionality.
- Favorites are gated behind sign-in even though their storage currently remains device-oriented.
- Search and parking recommendations depend on configured external services and may show loading, empty, stale-data, or retry states.
