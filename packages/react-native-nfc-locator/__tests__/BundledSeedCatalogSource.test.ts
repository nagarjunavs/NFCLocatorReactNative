import { BundledSeedCatalogLoader, BundledSeedCatalogSource, type CatalogEntryDto, deviceFingerprint } from '../src';
import { fakeLogger, makeSignals } from './testDoubles';

const seedEntry: CatalogEntryDto = {
  manufacturer: 'google', model: 'pixel 8', formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar',
  zoneX: 0.3, zoneY: 0.16, zoneWidth: 0.4, zoneHeight: 0.14, catalogVersion: 1,
};
const signalsFor = (m: string, model: string) =>
  makeSignals({ fingerprint: deviceFingerprint(m, m, model, model, model, null), isAndroid14ApiAvailable: false });
const sourceWith = (entries: CatalogEntryDto[]) => {
  const logger = fakeLogger();
  return new BundledSeedCatalogSource(new BundledSeedCatalogLoader(logger, () => ({ catalogVersion: 1, entries })), logger);
};

describe('BundledSeedCatalogSource', () => {
  it('matches a known device from the bundled seed catalog', async () => {
    const r = await sourceWith([seedEntry]).resolve(signalsFor('google', 'pixel_8'));
    expect(r?.confidence).toBe('APPROXIMATE');
    expect(r?.source).toBe('SEED_CATALOG');
  });
  it('returns null for a device not present', async () => {
    expect(await sourceWith([seedEntry]).resolve(signalsFor('acme', 'widget_9000'))).toBeNull();
  });
  it('returns null when the seed is empty', async () => {
    expect(await sourceWith([]).resolve(signalsFor('google', 'pixel_8'))).toBeNull();
  });
  it('skips an invalid seed entry rather than crashing the lookup', async () => {
    expect(await sourceWith([{ ...seedEntry, formFactor: 'NOT_REAL' }]).resolve(signalsFor('google', 'pixel_8'))).toBeNull();
  });
  it('a sku-qualified fingerprint degrades to the base-model entry', async () => {
    const fp = deviceFingerprint('google', 'google', 'pixel_8', 'shiba', 'shiba', 'eu_open');
    const r = await sourceWith([seedEntry]).resolve(makeSignals({ fingerprint: fp }));
    expect(r?.model).toBe('pixel 8');
  });
  it('a loader failure is logged and treated as an empty catalog', async () => {
    const logger = fakeLogger();
    const loader = new BundledSeedCatalogLoader(logger, () => { throw new Error('asset missing'); });
    expect(await new BundledSeedCatalogSource(loader, logger).resolve(signalsFor('google', 'pixel_8'))).toBeNull();
    expect(logger.e).toHaveBeenCalled();
  });
  it('loads once and caches', async () => {
    const provider = jest.fn(() => ({ catalogVersion: 1, entries: [seedEntry] }));
    const loader = new BundledSeedCatalogLoader(fakeLogger(), provider);
    await loader.load();
    await loader.load();
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
