# ParkMunich

A native iOS/Android app for exploring Munich's public parking data, built with
[Expo](https://docs.expo.dev/) (SDK 54), Expo Router, and `expo-maps`.
Parking-regulation data comes from the Munich Open Data Portal through
Supabase.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and provide the Supabase project URL, anon
   key, and native Maps SDK keys:

   ```bash
   cp .env.example .env
   ```

3. Start the dev server:

   ```bash
   npm start
   ```

   The map requires native modules (`expo-maps`), so run on a
   **development build** rather than Expo Go:

   ```bash
   npm run android   # or: npm run ios
   ```

## Project layout

```
src/
  app/            File-based routes (Expo Router)
    (tabs)/       Map, Search, Track, Profile, Settings screens
    parking/      Parking detail screen
  components/     Reusable UI (maps, cards, nav bar, filters)
  constants/      Theme and parking constants
  hooks/          Map and location hooks
  services/       Supabase parking data and clustering
  utils/          Geo + parking helpers
```

## Useful scripts

| Command                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm start`                  | Start the Expo dev server                |
| `npm run android` / `ios`    | Run on a connected device / simulator    |
| `npm run lint`               | Lint with `expo lint`                    |
| `npm run build:dev:android`  | EAS development build (Android)          |
| `npm run build:dev:ios`      | EAS development build (iOS)              |

## Google authentication callback

Google sign-in uses Supabase OAuth in the system browser and returns to the
native app at:

```
whitechoclate://auth/callback
```

Add that exact URL to **Supabase Dashboard > Authentication > URL
Configuration > Redirect URLs**. A broader `whitechoclate://**` allow-list
entry also works, but permits every callback path under the app scheme. This
dashboard setting cannot be configured from application code. Google first
returns to Supabase; Supabase then redirects to the app callback above.

## Maps & secrets

Google Maps keys are embedded into the **native build** by the `expo-maps`
Expo config plugin (`app.config.ts`); they are not exposed in the JS bundle at
runtime. `.env` is gitignored — never commit real keys.
