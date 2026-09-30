import { BundledSeedCatalogLoader, noopLogger, type CatalogEntryDto } from 'react-native-nfc-locator';
import { PhoneCatalogRepository, filterProfiles } from '../src/data/PhoneCatalogRepository';
import { FakeCatalogRemoteApi } from '../src/fake/FakeCatalogRemoteApi';

const dto = (over: Partial<CatalogEntryDto>): CatalogEntryDto => ({
  manufacturer: 'google', model: 'pixel 8', formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar',
  zoneX: 0.3, zoneY: 0.16, zoneWidth: 0.4, zoneHeight: 0.14, catalogVersion: 1, ...over,
});
const repo = (seed: CatalogEntryDto[], remote: CatalogEntryDto[] | Error) =>
  new PhoneCatalogRepository(
    new BundledSeedCatalogLoader(noopLogger, () => ({ catalogVersion: 1, entries: seed })),
    { fetchCatalog: async () => { if (remote instanceof Error) throw remote; return { catalogVersion: 2, entries: remote }; } },
  );

describe('PhoneCatalogRepository', () => {
  it('merges seed and remote; remote wins for the same device and is flagged REMOTE_CATALOG', async () => {
    const all = await repo([dto({ verified: false }), dto({ model: 'pixel 7' })], [dto({ verified: true, zoneY: 0.5 })]).listAll();
    expect(all).toHaveLength(2);
    const p8 = all.find((p) => p.model === 'pixel 8')!;
    expect(p8.source).toBe('REMOTE_CATALOG');
    expect(p8.confidence).toBe('EXACT');
    expect(p8.antennaZone.y).toBe(0.5);
    expect(all.find((p) => p.model === 'pixel 7')!.source).toBe('SEED_CATALOG');
  });
  it('a failing remote degrades to the seed alone', async () => {
    expect(await repo([dto({})], new Error('offline')).listAll()).toHaveLength(1);
  });
  it('drops invalid rows and sorts by manufacturer then model', async () => {
    const all = await repo([dto({ manufacturer: 'samsung', model: 'b' }), dto({ formFactor: 'X' }), dto({ manufacturer: 'apple', model: 'a' })], []).listAll();
    expect(all.map((p) => p.manufacturer)).toEqual(['apple', 'samsung']);
  });
  it('searches by manufacturer, raw model and marketing name', async () => {
    const all = await repo([dto({ manufacturer: 'samsung', model: 'sm-s918b' }), dto({})], []).listAll();
    expect(filterProfiles(all, 'galaxy s23')).toHaveLength(1);
    expect(filterProfiles(all, 'sm-s918')).toHaveLength(1);
    expect(filterProfiles(all, 'GOOGLE')).toHaveLength(1);
    expect(filterProfiles(all, '  ')).toHaveLength(2);
    expect(filterProfiles(all, 'zzz')).toHaveLength(0);
  });
  it('the real seed + the fake remote yields every catalog entry plus the 3 demo devices', async () => {
    const r = new PhoneCatalogRepository(new BundledSeedCatalogLoader(noopLogger), new FakeCatalogRemoteApi(0));
    const all = await r.listAll();
    // 43 seed entries; demo adds the emulator model (new) and overrides xiaomi + samsung a556b.
    expect(all.length).toBeGreaterThanOrEqual(44);
    expect(all.find((p) => p.model === 'sdk_gphone64_arm64')?.confidence).toBe('APPROXIMATE');
    expect(all.find((p) => p.model === '24031pn0dc')?.source).toBe('REMOTE_CATALOG');
  });
});
