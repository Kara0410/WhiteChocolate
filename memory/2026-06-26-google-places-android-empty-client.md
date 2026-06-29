# Google Places Android `<empty>` Client Rejection

Date: 2026-06-26

## Symptom

Android search logged:

`Unable to search places [Error: Requests from this Android client application <empty> are blocked.]`

## Root Cause

The app was using the same API key for native Android Maps SDK and Google Places REST Web Service calls. The key is Android-app restricted, which works for the native Maps SDK because Google can validate package name and SHA-1. A React Native `fetch()` call to `https://places.googleapis.com/v1/...` is a web-service request and does not carry that Android application identity, so Google sees Android client `<empty>` and rejects it.

## Fix

- Changed the Places REST client to read `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` instead of reusing `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Updated local `.env` to leave `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=` empty until a separate Places API key is configured.
- Added user-friendly handling for the Android `<empty>` rejection and suppressed dev warning spam for expected key setup errors.

## Required Setup

Create a separate Google Cloud key for Places REST:

- Enable Places API.
- Restrict API usage to Places API.
- For production, prefer a backend proxy with a server-side key instead of bundling the key in the Expo client.

## Evidence

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run test:clustering` passed.

## Status

DONE_WITH_CONCERNS: Code no longer reuses the Android SDK key for Places, but live search requires a valid separate Places key or backend proxy.
