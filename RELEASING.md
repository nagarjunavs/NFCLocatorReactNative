# Releasing

## Library (npm)

1. Run `npm run check:catalog && npm run typecheck && npm test`.
2. Update `CHANGELOG.md` and bump the version in `packages/react-native-nfc-locator/package.json`.
3. Tag `v<version>`. `.github/workflows/publish.yml` checks that the tag matches the package version,
   runs the checks and publishes with npm provenance. It authenticates through npm trusted publishing
   (GitHub Actions OIDC), so no npm token is stored in the repository. The trusted publisher is
   configured on npmjs.com for owner `nagarjunavs`, repo `NFCLocatorReactNative` and workflow
   `publish.yml`.

Check the tarball first with `npm pack --dry-run` in `packages/react-native-nfc-locator`.

The package ships compiled CommonJS and type declarations (`lib/`, built by `prepack`), the
TypeScript sources, the native projects, the podspec, the seed asset and the Expo config plugin.
Metro resolves the `react-native` field to the sources; Jest and other Node tooling use `lib/`.

## Sample app

- Keystores, signing keys and `local.properties` are git-ignored. Never commit them. The debug
  keystore in `android/app/` is the public React Native template one.
- Android: create an upload keystore and set `TAPSENSE_UPLOAD_STORE_FILE`,
  `TAPSENSE_UPLOAD_STORE_PASSWORD`, `TAPSENSE_UPLOAD_KEY_ALIAS` and `TAPSENSE_UPLOAD_KEY_PASSWORD` in
  `~/.gradle/gradle.properties` or the environment, then run `./gradlew :app:bundleRelease`. Without
  them the bundle is unsigned.
- iOS: open `ios/TapSense.xcworkspace`, set your team, and add the Near Field Communication Tag
  Reading capability under Signing & Capabilities. A build without it fails the tap test with
  `NFCError` code 2 the moment a session starts.
- Store checklists: `docs/play-store/CHECKLIST.md` and `docs/app-store/README.md`.
