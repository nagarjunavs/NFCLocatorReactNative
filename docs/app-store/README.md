# App Store checklist: TapSense

## Before submitting: verify the NFC entitlement on an iPhone
A build without the NFC Tag Reading capability registered for its App ID fails the tap test with
`NFCError` code 2 ("Missing required entitlement") as soon as a session starts, even though
`NFCTagReaderSession.readingAvailable` is `true`. It has not been verified on a physical iPhone.

1. Open `apps/tapsense/ios/TapSense.xcworkspace`, select the TapSense target and choose your team.
2. Under Signing & Capabilities, add Near Field Communication Tag Reading. This registers the
   capability for the App ID; the entitlements file alone does not.
3. Delete the app from the device, then rebuild and reinstall. Command-line builds need
   `-allowProvisioningUpdates`, and `-allowProvisioningDeviceRegistration` for a new device.
4. Check `codesign -d --entitlements :- <TapSense.app>` lists
   `com.apple.developer.nfc.readersession.formats`, then run the tap test. The system "Hold Near the
   Top of iPhone" sheet should appear.

NFC Tag Reading requires a paid Apple Developer Program membership.

## Project
- [x] Bundle ID `com.tapsense.app`, iPhone only, portrait, iOS 15.1 and later, version `1.0.0`.
- [x] `NFCReaderUsageDescription` and the `TAG` and `NDEF` reader formats are set.
- [x] `CFBundleLocalizations` lists the nine locales.
- [x] `AppIcon-1024.png` is 1024 px with no alpha channel. It was scaled up from a 512 px source, so
      export a native 1024 px version from the vector artwork before launch.
- [x] `ITSAppUsesNonExemptEncryption` is `false` and `PrivacyInfo.xcprivacy` is present.
- [ ] Decide the bundle id. Check `com.tapsense.app` against the id used by NFCLocatoriOS.
- [ ] Review notes: the tap test needs a physical iPhone and an NFC tag or reader.
- [ ] Support URL, privacy policy URL, category (Utilities), keywords and screenshots.
- [ ] Set `APP_STORE_ID` in `src/util/launchers.ts` once the listing exists. Until then the Rate row
      tells the user the listing is not available.

## App Privacy
The app collects no data, does no tracking, and makes no network calls (the catalog backend is a local
fake). Third-party code is React Native and the libraries in `package.json`;
`react-native-in-app-review` calls StoreKit's review prompt. Recheck this against `package.json`
before answering the questionnaire.
