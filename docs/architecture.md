# Architecture

## Layers

The package is mostly TypeScript. Native code only reports what JavaScript cannot see.

| Concern | Where |
|---|---|
| Models, resolver chain, catalog mapping, UI state, cache | TypeScript (`src/domain`, `src/data`, `src/ui/state.ts`) |
| Validation of the Android 14 antenna reading | TypeScript (`src/data/android14`) |
| React Native UI (silhouettes, sweep, badge, screen) | TypeScript with `react-native-svg` (`src/ui`) |
| Device identity, screen class, fold state | Native module, `getDeviceSignals()` |
| Raw `NfcAntennaInfo` reading (Android 14+) | Native module, `getNfcAntennaInfo()` |
| NFC availability and change events | Native module |
| Tap sessions (reader mode / Core NFC) | Native module, events carry a session id |

The native module has one Codegen spec (`src/native/NativeNfcLocator.ts`), a Kotlin implementation and
an Objective-C++ implementation. Every OS call is guarded, and any failure becomes `null` or `false`
on the JavaScript side.

## Resolver chain

`ResolveAntennaLocationUseCase` tries sources in order and returns the first answer:

1. **Android 14 OS reading.** `NfcAdapter#getNfcAntennaInfo()`. Rejected if the device size is zero
   or negative, the location is outside the device, or a value is not finite. The X coordinate is
   flipped because the OS reports the front frame and the silhouettes draw the back panel. Absent on
   iOS.
2. **Remote catalog.** Your `CatalogRemoteApi`, cached through `CatalogCache`. Any failure falls
   through.
3. **Bundled seed catalog.** 43 devices, works offline.
4. **Form-factor heuristic.** Always answers, always `GENERIC`.

A source that returns `null` or throws is skipped, so the use case always returns a profile.

## Confidence

- `EXACT`: the OS reading, or a catalog entry marked `verified`.
- `APPROXIMATE`: an unverified catalog entry. Older than 180 days, or never verified, it is stale and
  gets the guided sweep instead of a solid marker.
- `GENERIC`: heuristic only.
- `UNKNOWN`: nothing resolved.

The UI draws a solid marker only for `EXACT`, or `APPROXIMATE` and not stale.

## Catalog format

`CatalogEntryDto` and `CatalogResponseDto` are the wire format for both the remote catalog and
`assets/seed_catalog.json`. The Android and iOS libraries read the same shape, and a backend would
serve it. Coordinates are fractions (0..1) of the silhouette's bounding box, relative to the back
panel viewed with the phone upright. Entries are keyed `manufacturer:model`, both normalized
(lowercase, non-alphanumerics collapsed to `_`); a device fingerprint tries
`manufacturer:model:sku`, `manufacturer:model`, then the device and product codenames.

## Tap sessions

Android uses `NfcAdapter.enableReaderMode` and releases it when the app pauses. iOS uses
`NFCTagReaderSession`, which ends on its own when the system sheet is dismissed or after about a
minute. Each session has an id, and the JavaScript reader ignores callbacks for any session that is
not current. `sessionEnded` reports whether the session ever became active, which separates "no tag
was presented" from "the reader could not start" (on iOS usually a missing entitlement). A retry
always starts a new session.

## Platform differences

- iOS has no public antenna API, no NFC on/off switch and no fold API.
- Foldables: `androidx.window` reports no fold feature for a closed book-style foldable, so the
  closed state is only reachable through the phone picker.

## Localization

Nine locales. The strings are generated into TypeScript tables by `scripts/i18n.mjs`, which also
checks that every locale has the same keys and placeholders. The library takes a `locale` prop and
falls back to English.
