# Design decisions

## TypeScript core, thin native modules
The resolver chain, models, mappers and UI-state rules are written once in TypeScript and tested with
Jest. Native code reports device identity, fold state, the raw antenna reading, NFC state and tap
sessions, and nothing else. This keeps validation identical on both platforms, and the native modules
small enough to review. Embedding a native library per platform would have meant two UIs and two
persistence stacks behind the bridge.

## Minimum OS versions follow React Native
Android 24 and iOS 15.1, the minimums of React Native 0.87. The catalog cache is a JSON blob in
key-value storage instead of a database, so no framework raises the floor. It is a disposable cache:
a schema change starts it empty.

## New Architecture, Objective-C++ on iOS
One Codegen spec, a Kotlin module and an Objective-C++ module. The TurboModule scaffolding supports
Kotlin and Objective-C, and CoreNFC and `sysctl` need little code in Objective-C. There is no
dependency on the Expo Modules API. A small config plugin adds the iOS entitlement and usage string
for Expo development builds.

## Session ids for tap sessions
A Core NFC session can end by itself, and a retry may start a new one before the old one reports its
end. Native events carry a session id and both sides ignore anything that is not the current session.
`retry()` always starts a fresh session.

## Start delay for the iOS reader
Starting a Core NFC session during a navigation transition can get it rejected, so the tap test waits
500 ms after the screen appears.

## No animation or icon libraries
Silhouettes and animations use `react-native-svg` and React Native's `Animated`. Icons are inline SVG
paths. The runtime peers are `react`, `react-native`, `react-native-svg` and an optional storage
adapter.

## Explicit size wins over default stretch
The silhouette components fill their parent by default. An explicit `width` or `alignSelf` from the
caller takes precedence, so fixed-size markers can be centered.

## Settings are re-read on load
`SettingsStore.load()` returns the current settings each time, not the first snapshot, so screens
opened after a change do not revert it.

## UIScene life cycle on iOS
Apps built with the iOS 27 SDK must use scenes. The sample creates the React Native factory in
`AppDelegate` and the window in `SceneDelegate`. The library owns no window, so host apps only need
the same change in their own delegates.

## Backups
The sample sets `allowBackup="false"`. It stores nothing worth restoring, and this avoids depending on
the storage library's database path.

## Source and compiled distribution
The package ships both. Metro resolves the `react-native` field to `src/index.ts` and compiles the
sources with the app. `main` and `types` point at `lib/`, a Babel CommonJS build with `tsc`
declarations, for Jest and other Node tooling, which do not transform `node_modules` by default and
would otherwise fail on TypeScript. `prepack` builds `lib/`, so it exists only in the tarball. The
sample app maps the package to its sources in Jest and `tsconfig`, so its tests need no build step.

## Localization
Nine locales generated into TypeScript tables, with a check for missing keys and placeholder
mismatches. Right-to-left layouts are not supported.

## Out of scope
- No backend. `CatalogRemoteApi` and the DTOs define the contract; the sample binds a local fake.
- Tablet layouts. Tablets are detected and drawn correctly, but the sample is phone-only and
  portrait-locked.
