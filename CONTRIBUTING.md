# Contributing

```bash
npm install
npm test               # library and app tests
npm run typecheck
npm run check:catalog  # seed catalog and translation tables
```

- The seed catalog (`assets/seed_catalog.json`) and the translation tables are shared with
  NFCLocatorAndroid. Do not edit `seedCatalogData.ts` or `i18n/generated.ts` by hand: run
  `node scripts/seed.mjs sync` and `node scripts/i18n.mjs extract`. Set `NFC_LOCATOR_ANDROID_REPO` if
  the NFCLocatorAndroid checkout is not next to this repository.
- The UI never draws a solid marker for `GENERIC`, `UNKNOWN` or a stale `APPROXIMATE` result. The
  tests in `ui.test.tsx` enforce it.
- Test NFC behavior on a physical phone. Simulators and most emulators have no NFC hardware.
