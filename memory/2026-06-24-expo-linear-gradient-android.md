# ExpoLinearGradient Android warning

- Symptom: Android reported that `ExpoLinearGradient` was not exported by `expo-modules-core`, so gradient views could not render.
- Root cause: `expo-linear-gradient` was added to JavaScript dependencies after the installed development client was built. The native binary did not contain its view manager.
- Fix: Replaced decorative `expo-linear-gradient` views in `src/components/BottomNavBar.tsx` with `react-native-svg` gradients, which are already available in the client. Removed `expo-linear-gradient` from `package.json` and `package-lock.json`.
- Evidence: TypeScript and ESLint pass; no `ExpoLinearGradient` or `expo-linear-gradient` references remain. Android Metro bundling completed all 3206 modules before the environment blocked the Hermes executable.
- Regression check: `rg -n 'expo-linear-gradient|ExpoLinearGradient' package.json package-lock.json src` returns no matches.
- Status: DONE_WITH_CONCERNS — restart Metro with cache clearing and reload the installed client to verify the runtime warning is gone.
