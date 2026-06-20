# ParkMunich

A native iOS/Android app for exploring Munich's public parking data, built with
[Expo](https://docs.expo.dev/) (SDK 54), Expo Router, and `react-native-maps`.
Parking-regulation data comes from the Munich Open Data Portal.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Provide Google Maps API keys. Copy `.env.example` to `.env` and fill in your
   native Maps SDK keys (see the comments in `.env.example` for how to create and
   restrict them):

   ```bash
   cp .env.example .env
   ```

3. Start the dev server:

   ```bash
   npm start
   ```

   The map requires native modules (`react-native-maps`), so run on a
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
  constants/      Theme, parking/zone/vehicle constants
  data/           Bundled Munich parking dataset
  hooks/          useLocation
  services/       Parking data source
  utils/          Geo + parking helpers
scripts/
  generate-parking-data.js   Regenerate the bundled dataset (npm run generate:parking)
```

## Useful scripts

| Command                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm start`                  | Start the Expo dev server                |
| `npm run android` / `ios`    | Run on a connected device / simulator    |
| `npm run lint`               | Lint with `expo lint`                    |
| `npm run generate:parking`   | Rebuild the bundled parking dataset      |
| `npm run build:dev:android`  | EAS development build (Android)          |
| `npm run build:dev:ios`      | EAS development build (iOS)              |

## Maps & secrets

Google Maps keys are embedded into the **native build** by the `react-native-maps`
Expo config plugin (`app.config.ts`); they are not exposed in the JS bundle at
runtime. `.env` is gitignored — never commit real keys.
