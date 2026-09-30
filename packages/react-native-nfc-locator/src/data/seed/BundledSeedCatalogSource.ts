import type { AntennaLocationSource, NfcLocatorLogger } from '../../domain/seams';
import type { DeviceAntennaProfile, DeviceIdentitySignals } from '../../domain/model/DeviceAntennaProfile';
import { lookupKeys } from '../../domain/model/DeviceFingerprint';
import { DataSource } from '../../domain/model/enums';
import { catalogEntryLookupKey, toDomainOrNull } from '../remote/mapper';
import type { CatalogEntryDto } from '../remote/dto';
import type { BundledSeedCatalogLoader } from './BundledSeedCatalogLoader';

const TAG = 'BundledSeedCatalogSource';

/**
 * Layer 3: a small JSON catalog shipped inside the package (top-N devices). Used when both
 * the local cache and the remote catalog miss, so the library still gives a device-specific
 * answer fully offline.
 */
export class BundledSeedCatalogSource implements AntennaLocationSource {
  private index: Map<string, CatalogEntryDto> | null = null;

  constructor(
    private readonly loader: BundledSeedCatalogLoader,
    private readonly logger: NfcLocatorLogger,
  ) {}

  async resolve(signals: DeviceIdentitySignals): Promise<DeviceAntennaProfile | null> {
    const seed = await this.loader.load();
    if (seed.entries.length === 0) return null;
    // Later duplicates win.
    this.index ??= new Map(seed.entries.map((e) => [catalogEntryLookupKey(e), e] as const));
    for (const key of lookupKeys(signals.fingerprint)) {
      const dto = this.index.get(key);
      if (!dto) continue;
      const profile = toDomainOrNull(dto, DataSource.SEED_CATALOG);
      if (!profile) {
        this.logger.w(TAG, `Dropping invalid seed catalog entry for ${dto.manufacturer}/${dto.model}`);
        continue;
      }
      return profile;
    }
    return null;
  }
}
