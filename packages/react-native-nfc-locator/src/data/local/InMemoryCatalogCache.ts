import type { CatalogCache } from '../../domain/seams';
import type { DeviceAntennaProfile } from '../../domain/model/DeviceAntennaProfile';

/** Process-lifetime cache; the fallback when no persistent storage adapter is available. */
export class InMemoryCatalogCache implements CatalogCache {
  private readonly map = new Map<string, DeviceAntennaProfile>();

  async find(lookupKeys: readonly string[]): Promise<DeviceAntennaProfile | null> {
    for (const key of lookupKeys) {
      const hit = this.map.get(key);
      if (hit) return hit;
    }
    return null;
  }

  async upsertAll(entries: ReadonlyArray<readonly [string, DeviceAntennaProfile]>): Promise<void> {
    for (const [key, profile] of entries) this.map.set(key, profile);
  }

  async latestCachedVersion(): Promise<number> {
    let max = 0;
    for (const p of this.map.values()) max = Math.max(max, p.catalogVersion);
    return max;
  }

  async listAll(): Promise<DeviceAntennaProfile[]> {
    return [...this.map.values()];
  }
}
