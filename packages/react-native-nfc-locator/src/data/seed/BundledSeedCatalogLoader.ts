import type { NfcLocatorLogger } from '../../domain/seams';
import type { SeedCatalogDto } from '../remote/dto';
import { SEED_CATALOG_DATA } from './seedCatalogData';

const TAG = 'BundledSeedCatalogLoader';

/** Where the seed catalog comes from; overridable in tests. Defaults to the embedded data. */
export type SeedCatalogProvider = () => SeedCatalogDto | Promise<SeedCatalogDto>;

/**
 * Loads the bundled seed catalog once per instance and caches it in memory (small file).
 * On any failure, logs and returns an empty catalog so the chain falls through.
 */
export class BundledSeedCatalogLoader {
  private cached: Promise<SeedCatalogDto> | null = null;

  constructor(
    private readonly logger: NfcLocatorLogger,
    private readonly provider: SeedCatalogProvider = () => SEED_CATALOG_DATA,
  ) {}

  load(): Promise<SeedCatalogDto> {
    this.cached ??= this.parse();
    return this.cached;
  }

  private async parse(): Promise<SeedCatalogDto> {
    try {
      const seed = await this.provider();
      if (!seed || !Array.isArray(seed.entries)) throw new Error('malformed seed catalog');
      return seed;
    } catch (e) {
      this.logger.e(TAG, 'Failed to load bundled seed catalog, treating as empty', e);
      return { catalogVersion: 0, entries: [] };
    }
  }
}
