# TapSense

Sample app for [`react-native-nfc-locator`](../../packages/react-native-nfc-locator). It
finds where the NFC antenna is on the phone, lets you preview any catalog phone, walks through a tap,
and runs a live tap test.

Screens: splash, onboarding, home, my phone (back and front), phone picker, phone confirmed, tap
guide, tap test, troubleshooting, NFC basics and settings. Light and dark themes, nine languages, and a
reduce-motion switch.

The catalog backend is a local fake (`src/fake/FakeCatalogRemoteApi.ts`), so the app works offline and
can show every confidence level.

## Structure

```
src/
  App.tsx, AppEnvironment.ts   composition root: locator, storage, catalog, tap reader
  screens/                     one file per screen (or small group)
  navigation/                  one flat stack plus a custom bottom bar
  nfc/TapTestMachine.ts        tap-test state machine behind the TapReaderController interface
  data/                        settings store, phone catalog
  state/                       hooks for settings, antenna resolution and NFC state
  theme/, ui/, i18n/, util/
```

## Run

From the repository root, `npm install`, then:

```bash
npx react-native start
cd android && ./gradlew :app:installDebug      # Android debug id: com.tapsense.app.rndebug
cd ios && pod install && cd .. && npx react-native run-ios
```

Emulators and the iOS Simulator have no NFC, so the tap test shows its "no NFC hardware" state there.
Use a physical phone for the live test.

## Tests

`npm test` runs the settings store, phone catalog, tap-test state machine, error boundary and screen
tests.

## Known limitations

- Changing the app language in the Android 13+ system picker applies on the next launch, not live.
- The live tap test has not been run on physical devices.
- Phones only: no tablet layouts and no right-to-left support.
