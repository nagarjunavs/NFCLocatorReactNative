import fs from 'node:fs';
import path from 'node:path';
import {
  BundledSeedCatalogLoader,
  BundledSeedCatalogSource,
  SEED_CATALOG_DATA,
  createNfcLocator,
  deviceFingerprint,
  deviceFingerprintFromRaw,
  toDomainOrNull,
  toUiState,
} from '../src';
import { fakeLogger, makeSignals } from './testDoubles';

const assetPath = path.join(__dirname, '../assets/seed_catalog.json');

describe('bundled seed catalog', () => {
  it('generated TS data deep-equals assets/seed_catalog.json', () => {
    expect(SEED_CATALOG_DATA).toEqual(JSON.parse(fs.readFileSync(assetPath, 'utf8')));
  });

  it('is catalogVersion 2 with 43 unique, fully valid entries covering every form factor', () => {
    expect(SEED_CATALOG_DATA.catalogVersion).toBe(2);
    expect(SEED_CATALOG_DATA.entries).toHaveLength(43);
    const profiles = SEED_CATALOG_DATA.entries.map((e) => toDomainOrNull(e, 'SEED_CATALOG'));
    expect(profiles.every((p) => p !== null)).toBe(true);
    expect(new Set(profiles.map((p) => p!.formFactor))).toEqual(new Set(['BAR', 'FOLD_BOOK', 'FOLD_FLIP', 'TABLET']));
  });
});

// Fixed device list. verified -> EXACT, unverified -> APPROXIMATE; zones are the raw catalog values.
const GOLDEN: Array<[string, string, string, string, string, number[]]> = [
  // [manufacturer, model(raw Build.MODEL), expected confidence, expected form factor, template, zone]
  ['google', 'Pixel 8', 'EXACT', 'BAR', 'silhouette_bar', [0.3, 0.16, 0.4, 0.14]],
  ['google', 'Pixel 8 Pro', 'EXACT', 'BAR', 'silhouette_bar', [0.3, 0.16, 0.4, 0.14]],
  ['google', 'Pixel 7', 'APPROXIMATE', 'BAR', 'silhouette_bar', [0.3, 0.18, 0.4, 0.14]],
  ['samsung', 'SM-S918B', 'EXACT', 'BAR', 'silhouette_bar', [0.32, 0.3, 0.36, 0.16]],
  ['samsung', 'SM-F946B', 'EXACT', 'FOLD_BOOK', 'silhouette_fold_book_closed', [0.28, 0.2, 0.44, 0.16]],
  ['samsung', 'SM-F731B', 'APPROXIMATE', 'FOLD_FLIP', 'silhouette_fold_flip_closed', [0.32, 0.4, 0.36, 0.16]],
  ['samsung', 'SM-X610', 'EXACT', 'TABLET', 'silhouette_tablet', [0.4, 0.42, 0.2, 0.14]],
  ['motorola', 'razr 2024', 'APPROXIMATE', 'FOLD_FLIP', 'silhouette_fold_flip_closed', [0.32, 0.4, 0.36, 0.16]],
];

describe('seed golden resolution', () => {
  it.each(GOLDEN)('%s %s', async (manufacturer, model, confidence, formFactor, template, zone) => {
    const logger = fakeLogger();
    const source = new BundledSeedCatalogSource(new BundledSeedCatalogLoader(logger), logger);
    const fp = deviceFingerprintFromRaw({ manufacturer, brand: manufacturer, model, device: model, product: model });
    const r = await source.resolve(makeSignals({ fingerprint: fp, isAndroid14ApiAvailable: false }));
    expect(r).not.toBeNull();
    expect(r!.confidence).toBe(confidence);
    expect(r!.source).toBe('SEED_CATALOG');
    expect(r!.formFactor).toBe(formFactor);
    expect(r!.silhouetteTemplateId).toBe(template);
    expect([r!.antennaZone.x, r!.antennaZone.y, r!.antennaZone.width, r!.antennaZone.height]).toEqual(zone);
  });

  it('every seed entry resolves from its own fingerprint (lookup normalization round-trips)', async () => {
    const logger = fakeLogger();
    const source = new BundledSeedCatalogSource(new BundledSeedCatalogLoader(logger), logger);
    for (const e of SEED_CATALOG_DATA.entries) {
      const fp = deviceFingerprintFromRaw({ manufacturer: e.manufacturer, brand: e.manufacturer, model: e.model, device: e.model, product: e.model });
      const r = await source.resolve(makeSignals({ fingerprint: fp }));
      expect(r?.model).toBe(e.model);
    }
  });

  it('an unknown device falls through to GENERIC with the sweep state; a stale unverified seed entry gets the sweep too', async () => {
    const { resolve } = createNfcLocator({
      remoteApi: { fetchCatalog: async () => { throw new Error('offline'); } },
    });
    const unknown = await resolve(makeSignals({ fingerprint: deviceFingerprint('acme', 'acme', 'widget_9000', 'w', 'w', null), isAndroid14ApiAvailable: false }));
    expect(unknown.confidence).toBe('GENERIC');
    expect(toUiState(unknown).kind).toBe('fallbackGuidance');

    // Pixel 7 is unverified with an old lastVerifiedAt (Jan 2023): APPROXIMATE + stale today.
    const pixel7 = await resolve(makeSignals({ fingerprint: deviceFingerprintFromRaw({ manufacturer: 'Google', brand: 'google', model: 'Pixel 7', device: 'panther', product: 'panther' }), isAndroid14ApiAvailable: false }));
    expect(toUiState(pixel7, Date.UTC(2026, 8, 28))).toMatchObject({ kind: 'resolvedMarker', confidence: 'APPROXIMATE', isStale: true });
  });

  it('a foldable with an OS reading resolves different profiles open vs closed (chain level)', async () => {
    const provider = { getAntennaInfo: async () => ({ deviceWidth: 100, deviceHeight: 200, antennas: [{ locationX: 20, locationY: 20 }, { locationX: 80, locationY: 180 }] }) };
    const { resolve } = createNfcLocator({ remoteApi: { fetchCatalog: async () => ({ catalogVersion: 0, entries: [] }) }, antennaInfoProvider: provider });
    const fp = deviceFingerprint('google', 'google', 'pixel_fold', 'felix', 'felix', null);
    const closed = await resolve(makeSignals({ fingerprint: fp, formFactor: 'FOLD_BOOK', foldState: 'FOLDED' }));
    const open = await resolve(makeSignals({ fingerprint: fp, formFactor: 'FOLD_BOOK', foldState: 'UNFOLDED' }));
    expect(closed.silhouetteTemplateId).toBe('silhouette_fold_book_closed');
    expect(open.silhouetteTemplateId).toBe('silhouette_fold_book_open');
    expect(closed.antennaZone).not.toEqual(open.antennaZone);
  });
});
