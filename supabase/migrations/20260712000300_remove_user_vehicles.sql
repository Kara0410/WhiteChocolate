-- Saved Garage/user vehicle profiles were removed from the app.
-- Drop the cloud copy defensively; historical migrations remain unchanged.
drop table if exists public.user_vehicles cascade;
