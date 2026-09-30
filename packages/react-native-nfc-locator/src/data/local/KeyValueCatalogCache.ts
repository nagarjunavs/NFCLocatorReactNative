import type { CatalogCache } from '../../domain/seams';
import type { DeviceAntennaProfile } from '../../domain/model/DeviceAntennaProfile';
import { isConfidence, isDataSource, isFormFactor } from '../../domain/model/enums';
import { tryNormalizedRect } from '../../domain/model/NormalizedRect';

/** Minimal async string storage; AsyncStorage and MMKV adapters both satisfy this shape. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Bump to invalidate every previously stored cache: a schema change just starts over empty. */
const CACHE_SCHEMA_VERSION = 1;
const STORAGE_KEY = `nfc_locator.catalog_cache.v${CACHE_SCHEMA_VERSION}`;

type Stored = Record<string, DeviceAntennaProfile>;

/**
 * Disposable catalog cache persisted as one JSON blob in a {@link KeyValueStorage}. No
 * migrations: a corrupt or old-schema blob is treated as empty, and a row that fails
 * validation on read is skipped.
 */
export class KeyValueCatalogCache implements CatalogCache {
  private loaded: Promise<Map<string, DeviceAntennaProfile>> | null = null;

  constructor(private readonly storage: KeyValueStorage) {}

  private load(): Promise<Map<string, DeviceAntennaProfile>> {
    this.loaded ??= this.read();
    return this.loaded;
  }

  private async read(): Promise<Map<string, DeviceAntennaProfile>> {
    const map = new Map<string, DeviceAntennaProfile>();
    try {
      const raw = await this.storage.getItem(STORAGE_KEY);
      if (!raw) return map;
      const parsed = JSON.parse(raw) as Stored;
      for (const [key, value] of Object.entries(parsed)) {
        const profile = revive(value);
        if (profile) map.set(key, profile);
      }
    } catch {
      // Corrupt or unreadable: disposable cache, start empty.
    }
    return map;
  }

  private async persist(map: Map<string, DeviceAntennaProfile>): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)));
  }

  async find(lookupKeys: readonly string[]): Promise<DeviceAntennaProfile | null> {
    const map = await this.load();
    for (const key of lookupKeys) {
      const hit = map.get(key);
      if (hit) return hit;
    }
    return null;
  }

  async upsertAll(entries: ReadonlyArray<readonly [string, DeviceAntennaProfile]>): Promise<void> {
    if (entries.length === 0) return;
    const map = await this.load();
    for (const [key, profile] of entries) map.set(key, profile);
    try {
      await this.persist(map);
    } catch {
      // Storage full or unavailable: the entries stay usable in memory for this session.
    }
  }

  async latestCachedVersion(): Promise<number> {
    const map = await this.load();
    let max = 0;
    for (const p of map.values()) max = Math.max(max, p.catalogVersion);
    return max;
  }

  async listAll(): Promise<DeviceAntennaProfile[]> {
    return [...(await this.load()).values()];
  }
}

function revive(v: DeviceAntennaProfile | null | undefined): DeviceAntennaProfile | null {
  if (!v || typeof v !== 'object') return null;
  if (!isFormFactor(v.formFactor) || !isConfidence(v.confidence) || !isDataSource(v.source)) return null;
  const z = v.antennaZone;
  const rect = z ? tryNormalizedRect(z.x, z.y, z.width, z.height) : null;
  if (!rect) return null;
  return { ...v, antennaZone: rect };
}
