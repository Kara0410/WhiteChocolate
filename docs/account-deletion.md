# Account deletion

Account deletion is handled by the `delete-account` Supabase Edge Function.
The Expo client never contains a service-role key and never sends a user ID as
the authority for deletion.

Deploy the function with the Supabase CLI and configure these server-side
secrets in the Supabase project:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The function validates the caller's bearer token, obtains the authenticated user
from Supabase Auth, and deletes that user through the Admin API. Current app
tables that reference `auth.users` use `ON DELETE CASCADE` for profiles,
vehicles, favorites, preferences, and consent events. `deletion_requests` uses
`ON DELETE SET NULL` so its audit row can remain without identifying the deleted
user.

The client requires typing `DELETE` before invoking the function. After the
server confirms deletion, the app clears local favorites, preferences, and
onboarding state. A local cleanup failure is reported separately; it never
changes the server deletion result.

This flow does not cancel subscriptions because subscription cancellation is not
implemented in the current application.
