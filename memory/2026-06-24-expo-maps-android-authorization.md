# Expo Maps Android blank tiles

- Symptom: Google branding and zoom controls render, but map tiles remain blank.
- Root cause: Google Maps Android API rejects the installed APK with an authorization failure. The app key is embedded, but Google Cloud must authorize package `com.whitechoclate.app` with the installed APK signing certificate SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Evidence: Android logcat reports `Authorization failure`, the embedded API key, and the required package/SHA-1 pair. `apksigner` confirms the installed APK uses that SHA-1. The local debug keystore uses a different SHA-1, so it cannot authorize this installed EAS-signed build.
- Required external fix: Enable Maps SDK for Android and configure the API key's Android application restriction with the exact installed package/SHA-1 pair. Ensure billing is active.
- Rebuild requirement: Google Cloud restriction changes do not require rebuilding when the embedded key remains unchanged. Replacing/rotating the key requires a new native build.
- Status: BLOCKED on Google Cloud Console configuration.
