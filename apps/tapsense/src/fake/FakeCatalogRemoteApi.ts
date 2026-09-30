import type { CatalogRemoteApi, CatalogResponseDto } from 'react-native-nfc-locator';

const DEMO_CATALOG_VERSION = 2;

/**
 * Local stand-in for a real backend, so the sample demonstrates the full resolver chain
 * (including RemoteCatalogSource) without a server. A real host implements CatalogRemoteApi
 * against its own networking stack instead.
 *
 * Bound as the sample's *production* remote on purpose, so the app stays a runnable,
 * self-contained demo: the device catalog is frozen to the bundled seed plus these 3 demo
 * entries, with no live catalog growth. Wiring a real backend is a product decision to make
 * before shipping, not something this file infers.
 */
export class FakeCatalogRemoteApi implements CatalogRemoteApi {
  constructor(private readonly latencyMs: number = 400, private readonly now: () => number = Date.now) {}

  async fetchCatalog(sinceVersion: number): Promise<CatalogResponseDto> {
    // Simulated network latency so the loading state is visible in the demo.
    if (this.latencyMs > 0) await new Promise<void>((r) => setTimeout(r, this.latencyMs));
    if (sinceVersion >= DEMO_CATALOG_VERSION) return { catalogVersion: DEMO_CATALOG_VERSION, entries: [] };
    const verifiedAt = this.now();
    return {
      catalogVersion: DEMO_CATALOG_VERSION,
      entries: [
        // Matches the Android emulator's own Build.MODEL, so auto-detect resolves a real
        // APPROXIMATE (unverified) match end-to-end when running on an AVD.
        {
          manufacturer: 'google', model: 'sdk_gphone64_arm64', formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar',
          zoneX: 0.3, zoneY: 0.18, zoneWidth: 0.4, zoneHeight: 0.14, catalogVersion: DEMO_CATALOG_VERSION, lastVerifiedAtEpochMs: verifiedAt,
        },
        // Remote-only, verified flagship not in the bundled seed: demonstrates remote entries
        // both extending the seed and winning over it when the same device appears in both.
        {
          manufacturer: 'xiaomi', model: '24031pn0dc', formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar',
          zoneX: 0.3, zoneY: 0.2, zoneWidth: 0.4, zoneHeight: 0.14, catalogVersion: DEMO_CATALOG_VERSION, lastVerifiedAtEpochMs: verifiedAt, verified: true,
        },
        {
          manufacturer: 'samsung', model: 'sm-a556b', formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar',
          zoneX: 0.3, zoneY: 0.34, zoneWidth: 0.4, zoneHeight: 0.18, catalogVersion: DEMO_CATALOG_VERSION, lastVerifiedAtEpochMs: verifiedAt, verified: false,
        },
      ],
    };
  }
}
