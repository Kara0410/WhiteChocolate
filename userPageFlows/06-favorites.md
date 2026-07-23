# Favorites

## Flow 1: Open Favorites while signed out

Favorites are account-gated from all current entry points.

1. Tap `FAVORITES`, open `/favorites`, tap `View favorites` from `YOU`, or tap a parking-detail heart.
2. The app checks account state.
3. If the user is signed out, the requested favorites list/action does not open.
4. A bottom sheet titled `Create a free account` appears.
5. The sheet explains benefits and shows:
   - native Google continuation,
   - `Sign In / Sign Up with email`,
   - `Continue as guest`,
   - Close `X`, backdrop close, and swipe-down close.

### Prompt choices

- Google -> starts native Google authentication; spinner/error states remain in the prompt.
- Email -> closes the prompt and opens `/account/profile`, where the email sign-in/registration card is shown.
- Continue as guest/Close -> dismisses the prompt and returns to the underlying map or account screen.

## Flow 2: Open Favorites while signed in

1. Tap `FAVORITES` or open `/favorites`/`View favorites`.
2. If coming from another route, the app returns to `/map`.
3. The `Favorite parking areas` bottom sheet opens at its larger snap point.
4. The header shows a singular/plural favorite count.
5. The sheet refreshes device favorites when it mounts.

## Flow 3: Empty favorites

When there are no saved areas, the user sees:

- a heart illustration,
- `No favorite parking areas yet`, and
- `Tap the heart on a parking area to add it here.`

## Flow 4: Open a saved favorite

1. Tap a favorite row.
2. The Favorites sheet closes.
3. The map focuses that parking area after the sheet transition.
4. The parking-detail sheet opens with the favorite heart filled.

Each favorite row may show availability percentage, availability-unavailable copy, and walking time when a destination distance exists.

## Flow 5: Remove a favorite from the list

1. Swipe a favorite row left.
2. A red trash action is revealed.
3. Release after a short swipe to leave the trash action open, then tap it; or continue past the full-delete threshold.
4. The row animates out and the item is removed.
5. Tapping a row while any swipe action is open first closes the action instead of opening details.

There is no second confirmation dialog for removing a favorite.

## Flow 6: Favorite loading/storage error

1. An error panel appears below the Favorites header with the storage/service error message.
2. Tap `Retry` to refresh favorites again.
3. Existing favorite rows can remain visible beneath the error.

## Flow 7: Close Favorites

Tap the header `X`, swipe the sheet down, tap the map, tap the active Favorites navigation item again, or press Android hardware Back. The sheet closes and the user remains on the map.

