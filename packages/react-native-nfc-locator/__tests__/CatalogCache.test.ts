import { InMemoryCatalogCache, KeyValueCatalogCache, type KeyValueStorage } from '../src';
import { makeProfile } from './testDoubles';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const storage: KeyValueStorage & { data: Record<string, string> } = {
    data,
    getItem: async (k) => data[k] ?? null,
    setItem: async (k, v) => { data[k] = v; },
  };
  return storage;
}

describe.each([
  ['InMemoryCatalogCache', () => new InMemoryCatalogCache()],
  ['KeyValueCatalogCache', () => new KeyValueCatalogCache(memoryStorage())],
])('%s', (_name, make) => {
  it('finds the first matching key, most specific first', async () => {
    const cache = make();
    await cache.upsertAll([['a:b', makeProfile({ model: 'base' })], ['a:b:sku', makeProfile({ model: 'variant' })]]);
    expect((await cache.find(['a:b:sku', 'a:b']))?.model).toBe('variant');
    expect((await cache.find(['x:y', 'a:b']))?.model).toBe('base');
    expect(await cache.find(['nope'])).toBeNull();
  });
  it('tracks the latest cached version, 0 when empty', async () => {
    const cache = make();
    expect(await cache.latestCachedVersion()).toBe(0);
    await cache.upsertAll([['a', makeProfile({ catalogVersion: 3 })], ['b', makeProfile({ catalogVersion: 5 })]]);
    expect(await cache.latestCachedVersion()).toBe(5);
    expect(await cache.listAll()).toHaveLength(2);
  });
  it('upsert replaces an existing key', async () => {
    const cache = make();
    await cache.upsertAll([['a', makeProfile({ catalogVersion: 1 })]]);
    await cache.upsertAll([['a', makeProfile({ catalogVersion: 2 })]]);
    expect((await cache.find(['a']))?.catalogVersion).toBe(2);
    expect(await cache.listAll()).toHaveLength(1);
  });
});

describe('KeyValueCatalogCache persistence', () => {
  it('survives a restart (new instance, same storage), preserving all fields', async () => {
    const storage = memoryStorage();
    const p = makeProfile({ confidence: 'EXACT', lastVerifiedAtEpochMs: 1234, aspectRatio: 0.47 });
    await new KeyValueCatalogCache(storage).upsertAll([['k', p]]);
    expect(await new KeyValueCatalogCache(storage).find(['k'])).toEqual(p);
  });
  it('treats a corrupt blob as empty instead of throwing', async () => {
    const seeded = memoryStorage();
    await new KeyValueCatalogCache(seeded).upsertAll([['k', makeProfile()]]);
    const key = Object.keys(seeded.data)[0]!;
    const corrupt = memoryStorage({ [key]: '{not json' });
    expect(await new KeyValueCatalogCache(corrupt).find(['k'])).toBeNull();
  });
  it('skips unparseable rows on read (bad enum / out-of-range zone)', async () => {
    const seeded = memoryStorage();
    await new KeyValueCatalogCache(seeded).upsertAll([['ok', makeProfile()]]);
    const key = Object.keys(seeded.data)[0]!;
    const blob = JSON.parse(seeded.data[key]!);
    blob.bad1 = { ...blob.ok, formFactor: 'SPHERE' };
    blob.bad2 = { ...blob.ok, antennaZone: { x: 2, y: 0, width: 1, height: 1 } };
    const cache = new KeyValueCatalogCache(memoryStorage({ [key]: JSON.stringify(blob) }));
    expect(await cache.find(['ok'])).not.toBeNull();
    expect(await cache.find(['bad1'])).toBeNull();
    expect(await cache.find(['bad2'])).toBeNull();
  });
});

describe('KeyValueCatalogCache storage failures', () => {
  it('keeps entries in memory when the write fails', async () => {
    const cache = new KeyValueCatalogCache({
      getItem: async () => null,
      setItem: async () => { throw new Error('disk full'); },
    });
    await expect(cache.upsertAll([['a', makeProfile({ catalogVersion: 2 })]])).resolves.toBeUndefined();
    expect((await cache.find(['a']))?.catalogVersion).toBe(2);
  });
  it('starts empty when the read fails', async () => {
    const cache = new KeyValueCatalogCache({
      getItem: async () => { throw new Error('unavailable'); },
      setItem: async () => {},
    });
    expect(await cache.find(['a'])).toBeNull();
  });
});
