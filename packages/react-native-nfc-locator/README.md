# react-native-nfc-locator

Shows a user where the NFC antenna is on their phone, so they can hold it against a reader, tag or
smart lock, and says how sure it is.

Companion to [NFCLocatorAndroid](https://github.com/nagarjunavs/NFCLocatorAndroid) and
[NFCLocatoriOS](https://github.com/nagarjunavs/NFCLocatoriOS); shares the catalog wire format.

- Every result is `EXACT`, `APPROXIMATE`, `GENERIC` or `UNKNOWN`, with its `source`. A solid marker is
  drawn only for trustworthy results; everything else is a dashed zone with a guided sweep.
- The resolver chain tries the Android 14 OS reading, then your remote catalog, then a bundled offline
  catalog of 43 phones, then a form-factor heuristic that always answers.
- Networking, analytics and logging are interfaces you implement. The library makes no network calls.
- New Architecture only (TurboModule), TypeScript, works in bare React Native and Expo development
  builds.

## Platform gap

There is **no public iOS API** that reports where the antenna is, so iOS runs a 3-layer chain and
`EXACT` is reachable only through a `verified` catalog entry. On Android 14+ the OS may report the
measured position, but that API is OEM-implemented and often empty; the library validates and
rejects implausible readings.

## Install

```bash
npm install react-native-nfc-locator react-native-svg
# optional, for a cache that survives restarts:
npm install @react-native-async-storage/async-storage
cd ios && pod install
```

Requires React Native with the New Architecture (Android minSdk 24, iOS 15.1 at RN 0.87).

**Bare RN:** Android's `NFC` permission is merged from the library's manifest. For iOS, add the
*Near Field Communication Tag Reading* capability and an `NFCReaderUsageDescription` (only needed
for the live tap test; the locator itself does not start an NFC session).

**Expo (development build):** add the config plugin, then `npx expo prebuild`:

```json
{ "expo": { "plugins": [["react-native-nfc-locator", { "nfcReaderUsageDescription": "…" }]] } }
```

> **iOS entitlement caveat.** A build without the NFC Tag Reading capability registered for its App
> ID fails the tap test with `NFCError` code 2 ("Missing required entitlement") the moment a session
> starts, even though `readingAvailable` is `true`. Add the capability in Xcode's *Signing &
> Capabilities* (this registers it against the App ID), delete the app, and reinstall; command-line
> builds need `-allowProvisioningUpdates`. Paid Apple Developer Program membership is required.

## Quick start

```tsx
import {
  AntennaLocatorScreen, createNfcLocator, createNativeAntennaInfoProvider, getNativeModule,
  readDeviceSignals, useAntennaLocation, type CatalogRemoteApi, type DeviceIdentitySignals,
} from 'react-native-nfc-locator';
import { Platform } from 'react-native';

// 1. The seams you own. Throwing from the remote is fine: the chain just falls through.
const remoteApi: CatalogRemoteApi = { fetchCatalog: async (sinceVersion) => myBackend.catalog(sinceVersion) };

const native = getNativeModule();
const locator = createNfcLocator({
  remoteApi,
  analytics: myAnalytics,   // optional
  logger: myLogger,         // optional
  // Android only: layer 1. Omit on iOS.
  antennaInfoProvider: Platform.OS === 'android' && native ? createNativeAntennaInfoProvider(native) : undefined,
});

// 2. Resolve and render.
// `signals` comes from readDeviceSignals(native); keep the object referentially stable (state or a ref).
function Screen({ signals }: { signals: DeviceIdentitySignals | null }) {
  const { state, retry } = useAntennaLocation(locator, signals);
  return <AntennaLocatorScreen state={state} onRetry={retry} locale="en" />;
}
```

Lower-level pieces (`AntennaSilhouette`, `GuidedSweepAnimation`, `ConfidenceBadge`,
`RetryGuidanceBanner`, `toUiState`) are exported if you want your own layout. Theme through the
`theme` prop or `<NfcLocatorThemeProvider>`; the library never hardcodes brand colors. Reduced motion
honors both a `reducedMotion` prop and the OS setting.

## Integration seams

| Interface | You provide | If you don't |
|---|---|---|
| `CatalogRemoteApi` | `fetchCatalog(sinceVersion)` against your backend | required (throw to opt out) |
| `NfcLocatorAnalytics` | 6 typed events (`guidanceShown`, `catalogMatchFound`, …), documented in TSDoc | no-op |
| `NfcLocatorLogger` | `d` / `w` / `e` | no-op |
| `CatalogCache` | e.g. `new KeyValueCatalogCache(asyncStorage)` | in-memory |
| `DeviceFingerprintProvider` / signals | override the real device (e.g. a phone picker) | real device |

The wire contract (`CatalogEntryDto`, `CatalogResponseDto`) is shared verbatim with the native
libraries and any future backend; field names must not change.

## Known limitations

- The live tap test has not been run on physical devices.
- On iOS, `EXACT` comes only from a verified catalog entry.
- Right-to-left layouts are untested.
- Only React Native 0.87 has been built and tested. The peer range starts at 0.82, the first release
  that is New Architecture only.

## Localization

English, Spanish, Brazilian Portuguese, French, German, Hindi, Japanese, Korean, Simplified Chinese;
pass `locale` (BCP-47). RTL is not supported yet.

## License

MIT
