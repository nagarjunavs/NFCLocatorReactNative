import { type CatalogEntryDto, type DeviceAntennaProfile, RemoteCatalogSource, lookupKeys } from '../src';
import { fakeCache, fakeLogger, makeProfile, makeSignals } from './testDoubles';

const signals = makeSignals({ isAndroid14ApiAvailable: false });
const keys = lookupKeys(signals.fingerprint);
const cached = makeProfile();
const dto = (over: Partial<CatalogEntryDto> = {}): CatalogEntryDto => ({
  manufacturer: 'google', model: 'pixel 8', formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar',
  zoneX: 0.3, zoneY: 0.2, zoneWidth: 0.4, zoneHeight: 0.14, catalogVersion: 1, ...over,
});

describe('RemoteCatalogSource', () => {
  it('returns a cache hit without calling the remote api', async () => {
    const cache = fakeCache();
    cache.find.mockResolvedValueOnce(cached);
    const remote = { fetchCatalog: jest.fn() };
    const source = new RemoteCatalogSource(remote, cache, fakeLogger());
    expect(await source.resolve(signals)).toBe(cached);
    expect(remote.fetchCatalog).not.toHaveBeenCalled();
    expect(cache.find).toHaveBeenCalledWith(keys);
  });

  it('on cache miss, fetches from remote, persists, and re-reads the cache', async () => {
    const cache = fakeCache();
    cache.find.mockResolvedValueOnce(null).mockResolvedValueOnce(cached);
    const remote = { fetchCatalog: jest.fn(async () => ({ catalogVersion: 1, entries: [dto()] })) };
    const source = new RemoteCatalogSource(remote, cache, fakeLogger());
    expect(await source.resolve(signals)).toBe(cached);
    expect(remote.fetchCatalog).toHaveBeenCalledWith(0);
    expect(cache.upsertAll).toHaveBeenCalledTimes(1);
    const [[stored]] = cache.upsertAll.mock.calls as unknown as [[Array<[string, DeviceAntennaProfile]>]];
    expect(stored![0]![0]).toBe('google:pixel_8');
    expect(stored![0]![1].source).toBe('REMOTE_CATALOG');
  });

  it('requests only the delta since the latest cached version', async () => {
    const cache = fakeCache();
    cache.latestCachedVersion.mockResolvedValue(7);
    const remote = { fetchCatalog: jest.fn(async () => ({ catalogVersion: 7, entries: [] })) };
    await new RemoteCatalogSource(remote, cache, fakeLogger()).resolve(signals);
    expect(remote.fetchCatalog).toHaveBeenCalledWith(7);
  });

  it('returns null when both cache and remote miss', async () => {
    const remote = { fetchCatalog: jest.fn(async () => ({ catalogVersion: 0, entries: [] })) };
    expect(await new RemoteCatalogSource(remote, fakeCache(), fakeLogger()).resolve(signals)).toBeNull();
  });

  it('treats a network failure as unavailable and falls through rather than throwing', async () => {
    const logger = fakeLogger();
    const remote = { fetchCatalog: jest.fn(async () => { throw new Error('no network'); }) };
    expect(await new RemoteCatalogSource(remote, fakeCache(), logger).resolve(signals)).toBeNull();
    expect(logger.w).toHaveBeenCalled();
  });

  it('treats a cache failure during refresh as unavailable too', async () => {
    const cache = fakeCache();
    cache.upsertAll.mockRejectedValue(new Error('disk full'));
    const remote = { fetchCatalog: jest.fn(async () => ({ catalogVersion: 1, entries: [dto()] })) };
    expect(await new RemoteCatalogSource(remote, cache, fakeLogger()).resolve(signals)).toBeNull();
  });

  it('drops an invalid remote entry without failing the whole refresh', async () => {
    const cache = fakeCache();
    const remote = {
      fetchCatalog: jest.fn(async () => ({
        catalogVersion: 1,
        entries: [dto({ manufacturer: 'broken', model: 'entry', formFactor: 'NOT_A_REAL_FORM_FACTOR' }), dto({ model: 'pixel 9' })],
      })),
    };
    await new RemoteCatalogSource(remote, cache, fakeLogger()).resolve(signals);
    const [[stored]] = cache.upsertAll.mock.calls as unknown as [[Array<[string, DeviceAntennaProfile]>]];
    expect(stored).toHaveLength(1);
    expect(stored![0]![0]).toBe('google:pixel_9');
  });

  it('an invalid-only response upserts an empty list', async () => {
    const cache = fakeCache();
    const remote = { fetchCatalog: jest.fn(async () => ({ catalogVersion: 1, entries: [dto({ formFactor: 'X' })] })) };
    await new RemoteCatalogSource(remote, cache, fakeLogger()).resolve(signals);
    expect(cache.upsertAll).toHaveBeenCalledWith([]);
  });
});
