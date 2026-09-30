# NFC Locator for React Native

`react-native-nfc-locator` shows a user where the NFC antenna is on their phone, so they
can hold it against a reader, tag or smart lock without guessing. Every answer carries a confidence
level (`EXACT`, `APPROXIMATE`, `GENERIC`, `UNKNOWN`) and its source, and low-confidence answers are
drawn as a guided sweep instead of a pinpoint marker.

This repository holds the library and **TapSense**, a sample app that uses it.

Companion to [NFCLocatorAndroid](https://github.com/nagarjunavs/NFCLocatorAndroid) and
[NFCLocatoriOS](https://github.com/nagarjunavs/NFCLocatoriOS); shares the catalog wire format.

## Screenshots

_To do: onboarding, home (EXACT and APPROXIMATE), guided sweep, phone picker, tap test._

## Repository layout

| Path | Contents |
|---|---|
| [`packages/react-native-nfc-locator`](packages/react-native-nfc-locator) | The library: TypeScript resolver chain, React Native UI, and a TurboModule for platform signals. Install and usage are in its README. |
| [`apps/tapsense`](apps/tapsense) | The TapSense sample app. |
| [`docs/architecture.md`](docs/architecture.md) | How the library is put together. |
| [`DECISIONS.md`](DECISIONS.md) | Design decisions and their trade-offs. |

## Run the sample

```bash
npm install

# Android (emulator or device; ANDROID_HOME must be set)
cd apps/tapsense && npx react-native start
cd apps/tapsense/android && ./gradlew :app:installDebug   # debug id: com.tapsense.app.rndebug

# iOS
cd apps/tapsense/ios && pod install && cd .. && npx react-native run-ios
```

The sample makes no network calls. Its catalog backend is a local fake, so every confidence level can
be shown offline. **Change phone** previews any catalog phone: a verified entry (`EXACT`, solid
marker), a stale unverified entry (`APPROXIMATE`, dashed zone with a sweep), foldables, and Apple
models. `GENERIC` appears on a real device that is not in the catalog.

Emulators and the iOS Simulator have no NFC hardware, so the app shows its "no NFC hardware" states
there. The live tap test needs a physical phone, and on iOS also the NFC Tag Reading capability (see
the library README).

## Development

```bash
npm test               # library and app tests
npm run typecheck
npm run check:catalog  # seed catalog and translation tables
```

Requires Node 22+. Built against React Native 0.87 (New Architecture), React 19, TypeScript 6,
Android minSdk 24 and iOS 15.1.

## Known limitations

- The live tap test has not been run on physical devices.
- iOS has no public API for the antenna position, so `EXACT` there only comes from a verified catalog
  entry.
- The sample has no backend; the catalog is bundled plus a small local fake.
- Right-to-left layouts are untested, and the sample UI is phone-only and portrait-locked.
- `react-native-in-app-review` is a legacy-bridge module that runs through React Native's interop
  layer; check it on release builds.

## Troubleshooting

**Android Studio: `A problem occurred starting process 'command 'node''`.** Studio started from the
Dock does not inherit your shell's `PATH`, so Node installed through nvm is not visible to Gradle. The
sample sets `REACT_NATIVE_NODE_MODULES_DIR` in `android/build.gradle` and `android/app/build.gradle`
so Gradle sync does not need `node`. Codegen and JS bundling do, so start Studio from a
terminal:

```bash
/Applications/Android\ Studio.app/Contents/MacOS/studio
```

or run `launchctl setenv PATH "$PATH"` and restart it.

## License

MIT
