# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 0.1.0 (2026-09-30)

### Added

- Resolver chain: Android 14 OS reading, remote catalog, bundled seed catalog (43 devices) and a
  form-factor heuristic. Three layers on iOS, which has no OS antenna API.
- `EXACT`, `APPROXIMATE`, `GENERIC` and `UNKNOWN` confidence levels with a source on every result.
- `createNfcLocator()` with injectable `CatalogRemoteApi`, `NfcLocatorAnalytics`, `NfcLocatorLogger`
  and `CatalogCache`.
- React Native UI: `AntennaLocatorScreen`, `AntennaSilhouette`, `GuidedSweepAnimation`,
  `ConfidenceBadge`, `RetryGuidanceBanner` and the `useAntennaLocation` hook.
- TurboModule for device signals, NFC state, fold state, the raw antenna reading and tap sessions
  (Kotlin and Objective-C++), plus an Expo config plugin.
- Nine locales.
- Compiled CommonJS build and type declarations alongside the TypeScript sources.
- TapSense sample app, with an error boundary: onboarding, home, my phone, phone picker, tap guide, tap test, troubleshooting,
  education and settings, in light and dark themes.

### Notes

- Requires the React Native New Architecture. Android minSdk 24, iOS 15.1.
- The live tap test has not been run on physical devices.
