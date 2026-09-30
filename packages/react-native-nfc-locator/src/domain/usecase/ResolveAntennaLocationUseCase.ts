import type {
  AntennaLocationSource,
  NfcLocatorAnalytics,
  NfcLocatorLogger,
} from '../seams';
import type { DeviceAntennaProfile, DeviceIdentitySignals } from '../model/DeviceAntennaProfile';
import { DataSource } from '../model/enums';

const TAG = 'ResolveAntennaLocationUseCase';

export interface ResolverChain {
  /** Layer 1. Omit (`null`) on platforms with no OS antenna API (iOS): the chain is 3 layers. */
  android14Source: AntennaLocationSource | null;
  remoteCatalogSource: AntennaLocationSource;
  seedCatalogSource: AntennaLocationSource;
  genericFallbackSource: AntennaLocationSource;
}

/**
 * Evaluates the layered resolver chain in priority order, first successful hit wins:
 * Android14 -> remote catalog -> seed catalog -> generic fallback (which always succeeds).
 *
 * Each source signals "no answer" by returning `null`; a thrown error is treated the same way
 * (logged, source skipped) so one misbehaving layer can't break resolution for the chain.
 */
export class ResolveAntennaLocationUseCase {
  private readonly chain: readonly AntennaLocationSource[];

  constructor(
    chain: ResolverChain,
    private readonly analytics: NfcLocatorAnalytics,
    private readonly logger: NfcLocatorLogger,
  ) {
    this.chain = [
      chain.android14Source,
      chain.remoteCatalogSource,
      chain.seedCatalogSource,
      chain.genericFallbackSource,
    ].filter((s): s is AntennaLocationSource => s != null);
  }

  async invoke(signals: DeviceIdentitySignals): Promise<DeviceAntennaProfile> {
    for (const source of this.chain) {
      let profile: DeviceAntennaProfile | null;
      try {
        profile = await source.resolve(signals);
      } catch (e) {
        this.logger.e(TAG, `${source.constructor?.name ?? 'source'} threw during resolve`, e);
        continue;
      }
      if (!profile) continue;
      this.reportResolution(profile);
      return profile;
    }
    // Unreachable in practice: GenericFallbackSource never returns null. Kept as a defensive
    // last resort in case a future chain edit breaks that guarantee.
    throw new Error('Resolver chain exhausted without a result; GenericFallbackSource must always succeed');
  }

  private reportResolution(profile: DeviceAntennaProfile): void {
    this.analytics.guidanceShown(profile.confidence, profile.source, profile.formFactor);
    switch (profile.source) {
      case DataSource.ANDROID14_API:
        this.analytics.android14AntennaDetected(1);
        break;
      case DataSource.REMOTE_CATALOG:
      case DataSource.SEED_CATALOG:
        this.analytics.catalogMatchFound(profile.confidence, profile.source, profile.catalogVersion);
        break;
      case DataSource.HEURISTIC:
        this.analytics.unknownDeviceDetected(profile.manufacturer, profile.formFactor);
        break;
    }
  }
}
