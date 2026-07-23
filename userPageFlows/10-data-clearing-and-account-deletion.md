# Local-Data Clearing and Account Deletion

## Flow 1: Review local device data

1. Open `YOU` -> `Storage & local data`.
2. The page shows the number of favorite parking areas and `App preferences` under `Stored on this device`.
3. The page explains that these controls affect data saved only on this device.
4. Tap `Back` to leave without changes.

## Flow 2: Clear local app data

1. Tap `Clear local app data`.
2. The page moves to a confirmation state and asks `Clear these items from this device?`
3. Choose:
   - `Cancel` -> returns to the overview with no changes.
   - `Clear local data` -> begins clearing favorites and resetting preferences in parallel.
4. During the operation, the button shows `Clearing local data` with a spinner and both confirmation controls are disabled.
5. Success shows `Local data cleared`, explains that favorites/preferences were removed, and offers `Done`.
6. Tap `Done` -> `/account`.
7. Failure shows `Some local data could not be cleared. Please try again.` and keeps the confirmation flow available.

This action does not delete an account or server-side profile.

## Flow 3: Open account deletion

**Entry condition:** The user is signed in.

The deletion page is reachable from:

- `YOU` -> `Account actions` -> `Delete account`, or
- signed-in `/account/profile` -> `Delete account`.

The overview shows `What will be removed`:

- profile and account,
- favorites and preferences associated with the account,
- other account data stored by the app.

If a signed-out user reaches the route directly, the page shows `Sign in required` and no delete control.

## Flow 4: Confirm and permanently delete the account

1. Tap `Delete account` on the overview.
2. The page asks `Are you sure? This action cannot be undone.`
3. Choose:
   - `Cancel` -> returns to deletion overview.
   - `Delete permanently` -> starts the server deletion request.
4. During deletion, the control shows `Deleting account` with a spinner and cancellation is disabled.
5. Server failure shows the returned error in a red alert and leaves the account intact.
6. Server success then attempts to clear local favorites, preferences, and onboarding state.
7. The page shows `Account deleted` and explains the user is signed out and can continue without an account.
8. If local cleanup partially fails, an amber warning explains that the account was deleted but some device data may need manual clearing after restart.
9. Tap `Continue` -> `/onboarding`, because onboarding state was reset.

## Difference between the two destructive actions

| Action | Local favorites | Local preferences | Server account | Onboarding state |
|---|---:|---:|---:|---:|
| Clear local app data | Cleared | Reset | Unchanged | Unchanged |
| Delete account | Cleared after server success | Reset after server success | Permanently deleted | Reset |

