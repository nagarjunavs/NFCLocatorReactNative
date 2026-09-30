import type { CatalogRemoteApi } from './data/remote/CatalogRemoteApi';
import { RemoteCatalogSource } from './data/remote/RemoteCatalogSource';
import { BundledSeedCatalogLoader, type SeedCatalogProvider } from './data/seed/BundledSeedCatalogLoader';
import { BundledSeedCatalogSource } from './data/seed/BundledSeedCatalogSource';
import { Android14AntennaInfoSource } from './data/android14/Android14AntennaInfoSource';
import type { NfcAntennaInfoProvider } from './data/android14/types';
import { InMemoryCatalogCache } from './data/local/InMemoryCatalogCache';
import { GenericFallbackSource } from './domain/source/GenericFallbackSource';
import {
  type CatalogCache,
  type NfcLocatorAnalytics,
  type NfcLocatorLogger,
  noopAnalytics,
  noopLogger,
} from './domain/seams';
import { ResolveAntennaLocationUseCase } from './domain/usecase/ResolveAntennaLocationUseCase';
import type { DeviceAntennaProfile, DeviceIdentitySignals } from './domain/model/DeviceAntennaProfile';

export interface NfcLocatorOptions {
  /** Host's catalog backend. Throw to signal "unavailable"; the chain falls through. */
  remoteApi: CatalogRemoteApi;
  analytics?: NfcLocatorAnalytics;
  logger?: NfcLocatorLogger;
  /** Defaults to an in-memory cache; pass a persistent adapter for cross-launch caching. */
  cache?: CatalogCache;
  /**
   * Provide on Android (the OS reading is layer 1). Omit on iOS, which has no such API and
   * so runs the 3-layer chain. When omitted the Android 14 source is not in the chain at all.
   */
  antennaInfoProvider?: NfcAntennaInfoProvider;
  /** Override the seed catalog source (tests). Defaults to the embedded catalog. */
  seedCatalogProvider?: SeedCatalogProvider;
}

export interface NfcLocator {
  /** Runs the resolver chain; always returns a profile. */
  resolve(signals: DeviceIdentitySignals): Promise<DeviceAntennaProfile>;
  readonly useCase: ResolveAntennaLocationUseCase;
}

/**
 * Composition root: plain constructor injection, no DI framework. The three seams the host
 * supplies are `remoteApi`, `analytics` and `logger`.
 */
export function createNfcLocator(options: NfcLocatorOptions): NfcLocator {
  const logger = options.logger ?? noopLogger;
  const analytics = options.analytics ?? noopAnalytics;
  const cache = options.cache ?? new InMemoryCatalogCache();
  const seedLoader = new BundledSeedCatalogLoader(logger, options.seedCatalogProvider);
  const useCase = new ResolveAntennaLocationUseCase(
    {
      android14Source: options.antennaInfoProvider
        ? new Android14AntennaInfoSource(options.antennaInfoProvider, logger)
        : null,
      remoteCatalogSource: new RemoteCatalogSource(options.remoteApi, cache, logger),
      seedCatalogSource: new BundledSeedCatalogSource(seedLoader, logger),
      genericFallbackSource: new GenericFallbackSource(),
    },
    analytics,
    logger,
  );
  return { resolve: (signals) => useCase.invoke(signals), useCase };
}
