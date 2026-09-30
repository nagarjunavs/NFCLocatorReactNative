import type { AntennaLocationSource, CatalogCache, NfcLocatorLogger } from '../../domain/seams';
import type { DeviceAntennaProfile, DeviceIdentitySignals } from '../../domain/model/DeviceAntennaProfile';
import { lookupKeys } from '../../domain/model/DeviceFingerprint';
import { DataSource } from '../../domain/model/enums';
import type { CatalogRemoteApi } from './CatalogRemoteApi';
import { catalogEntryLookupKey, toDomainOrNull } from './mapper';

const TAG = 'RemoteCatalogSource';

/**
 * Layer 2: a versioned catalog fetched from the host's backend via the injected
 * {@link CatalogRemoteApi} and cached locally. Cache-first: a hit avoids a network round
 * trip. On a miss, fetches the delta since the last cached version, persists it, and re-reads.
 * Any network/parsing failure is "unavailable", never surfaced to the caller.
 */
export class RemoteCatalogSource implements AntennaLocationSource {
  constructor(
    private readonly remoteApi: CatalogRemoteApi,
    private readonly cache: CatalogCache,
    private readonly logger: NfcLocatorLogger,
  ) {}

  async resolve(signals: DeviceIdentitySignals): Promise<DeviceAntennaProfile | null> {
    const keys = lookupKeys(signals.fingerprint);
    const hit = await this.cache.find(keys);
    if (hit) return hit;
    const refreshed = await this.refreshCache();
    if (!refreshed) return null;
    return this.cache.find(keys);
  }

  private async refreshCache(): Promise<boolean> {
    try {
      const sinceVersion = await this.cache.latestCachedVersion();
      const response = await this.remoteApi.fetchCatalog(sinceVersion);
      const valid: Array<readonly [string, DeviceAntennaProfile]> = [];
      for (const dto of response.entries ?? []) {
        const profile = toDomainOrNull(dto, DataSource.REMOTE_CATALOG);
        if (!profile) {
          this.logger.w(TAG, `Dropping invalid remote catalog entry for ${dto?.manufacturer}/${dto?.model}`);
          continue;
        }
        valid.push([catalogEntryLookupKey(dto), profile]);
      }
      await this.cache.upsertAll(valid);
      return true;
    } catch (e) {
      this.logger.w(TAG, 'Remote catalog fetch failed, falling through', e);
      return false;
    }
  }
}
