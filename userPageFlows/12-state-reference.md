# Loading, Empty, Disabled, and Error State Reference

This reference collects visible states that can appear inside the main flows.

## App and onboarding

| Context | State | What the user sees | Available action |
|---|---|---|---|
| App launch | Onboarding state loading | Onboarding loading screen | Wait |
| Onboarding account | Account loading | `Checking your account...` + spinner | Wait |
| Onboarding location | Request running | `Checking location` + spinner | Wait |
| Ready | Completion running | `Preparing app` + spinner | Wait |
| Ready | Save failure | Setup could not be saved | Retry `Enter app` |
| Email auth | Invalid/incomplete inputs | Primary action disabled | Correct inputs |
| Registration | Password mismatch | `Passwords do not match.` | Correct confirmation |
| Registration | Confirmation required | Account-created confirmation notice | Confirm email, then log in |

## Map and parking data

| Context | State | What the user sees | Available action |
|---|---|---|---|
| Initial map | Camera/location resolving | `Finding your location...` | Wait |
| Web map | Unsupported platform | `Maps are only available on Android and iOS.` | Use surrounding navigation/deep links |
| Current location | Request running | Spinner in location control | Wait |
| Current location | Settings required | Dark status message + `Open Settings` | Open system Settings |
| Parking list | Empty | `No parking areas found` | Close/change map area |
| Parking list | Failed empty | `Unable to load parking areas` | `Retry` |
| Nearby search | Loading empty | `Finding nearby parking areas` | Wait/close |
| Nearby search | Empty | `No nearby parking areas found` | Search another place |
| Nearby search | Failed empty | `Unable to load parking areas` | `Retry` |
| Nearby search | Refresh with results | Existing results + updating spinner | Keep browsing/wait |
| Nearby search | Failed with results | Existing results + amber warning | Keep browsing/retry via later refresh |
| Parking detail | Missing estimate | Dash ring + `Estimate unavailable` | Other detail actions remain |
| Parking detail | Favorite storage error | Error panel | `Retry` |

## Search

| State | What the user sees | Available action |
|---|---|---|
| Empty query | Search help copy | Type or cancel |
| Searching | Spinner + `Searching Google Places...` | Wait/cancel |
| Resolving selected place | Spinner + `Loading place...` | Wait |
| No matches | `No places found` | Change query |
| Search error | Red error message | Change/retry query or cancel |

## Favorites

| State | What the user sees | Available action |
|---|---|---|
| Signed out | Create-account prompt | Google, email, guest, or close |
| Signed in, none saved | `No favorite parking areas yet` | Close and favorite a parking area |
| Storage/refresh failure | Error panel | `Retry` |
| Swipe row open | Red trash action | Delete or tap to close |

## Account and settings

| Context | State | What the user sees | Available action |
|---|---|---|---|
| Account page | Loading | Skeleton sections | Wait |
| Account/preferences/location | Refresh/storage error | Error panel | `Retry` |
| Premium | Not configured | Disabled `Coming later` | None |
| Restore purchases | Future | Disabled row with `Future` badge | None |
| Dark mode | Future | Disabled switch with `Future` badge | None |
| Help/legal/preferences subpages | Placeholder | `Foundation ready` plus implementation note | Back |

## Password recovery and callbacks

| Context | State | What the user sees | Available action |
|---|---|---|---|
| Reset request | Sending | `Sending reset link` + spinner | Wait |
| Reset request | Sent cooldown | Success notice + disabled `Reset link sent` | Wait 30 seconds/back |
| Reset request | Failure | Inline error | Correct/retry |
| Recovery link | Verifying | `Verifying your reset link...` | Wait |
| Recovery link | Invalid/expired | `Reset link unavailable` | New link or login |
| Password update | Validation problem | Length/mismatch message | Correct fields |
| Password update | Success | `Password updated` | Return to login |
| Google callback | Processing | `Completing Google sign-in...` | Wait |
| Google callback | Failure | Error + return button | Return through routing decision |

## Destructive actions

| Context | State | What the user sees | Available action |
|---|---|---|---|
| Local data | Confirmation | List of stored items + confirm/cancel | Clear or cancel |
| Local data | Clearing | Spinner + `Clearing local data` | Wait |
| Local data | Success | `Local data cleared` | Done |
| Account delete | Signed out direct access | `Sign in required` | Back |
| Account delete | Confirmation | Permanent-deletion warning | Delete or cancel |
| Account delete | Deleting | Spinner + `Deleting account` | Wait |
| Account delete | Server failure | Red error | Retry/cancel/back |
| Account delete | Success | `Account deleted` | Continue to onboarding |
| Account delete | Local cleanup warning | Success plus amber warning | Continue, then use local data controls if needed |

