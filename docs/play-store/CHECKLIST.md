# Play Store checklist: TapSense

## Build and signing
- [x] `applicationId` is `com.tapsense.app`. Debug builds use `com.tapsense.app.rndebug`, are labelled
      "TapSense Debug" and versioned `1.0.0-debug`.
- [x] `versionCode 1`, `versionName "1.0.0"` in `android/app/build.gradle`. Raise `versionCode` for
      every upload.
- [x] Language splits are disabled so the Android 13+ per-app language picker works on Play installs.
- [x] `allowBackup="false"`.
- [x] Release builds are unsigned unless `TAPSENSE_UPLOAD_STORE_FILE`, `TAPSENSE_UPLOAD_STORE_PASSWORD`,
      `TAPSENSE_UPLOAD_KEY_ALIAS` and `TAPSENSE_UPLOAD_KEY_PASSWORD` are set (Gradle properties or
      environment). The debug keystore is never used for release.
- [x] R8 and resource shrinking are on. Test a release build on a device before each upload.
- [ ] Create the upload keystore (kept out of git) and set the four variables above.
- [ ] Decide the package name. `com.tapsense.app` is also the id of the NFCLocatorAndroid app. Publishing
      this build under the same listing needs the same signing key and a `versionCode` above the
      last upload there; a separate listing needs a different `applicationId`.
- [ ] Check Play's current target API level requirement against `targetSdk` (currently 36).

## Permissions and data safety
- `NFC` (from the library manifest) and `VIBRATE`. `INTERNET` is debug-only.
- `uses-feature nfc` is not required, so devices without NFC can install the app and get `GENERIC`
  guidance.
- The app collects no data and makes no network calls. `react-native-in-app-review` uses Google's Play
  In-App Review API; check the Data safety answers against the final dependency list.
- [ ] Host the privacy policy (`apps/tapsense/store-listing/PRIVACY_POLICY.md`) and point
      `PRIVACY_POLICY_URL` in `src/util/launchers.ts` at it. The current URL is a path under the
      Android app's `/android/privacy/` page.

## Store assets
- [x] 512 px icon: `apps/tapsense/store-listing/assets/tapsense_icon_512.png`.
- [ ] Feature graphic (1024x500) and phone screenshots.

## Testing before release
- [ ] Tap test detects a tag on a physical NFC device; NFC-off state; Open NFC settings.
- [ ] A device that reports `NfcAntennaInfo` (Android 14+). Emulators never do.
- [ ] A foldable, to check the fold silhouettes.
