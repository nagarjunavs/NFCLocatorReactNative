import {
  type BundledSeedCatalogLoader,
  type CatalogRemoteApi,
  type DeviceAntennaProfile,
  catalogEntryLookupKey,
  toDomainOrNull,
} from 'react-native-nfc-locator';
import { friendlyDeviceName } from '../util/displayNames';

/**
 * Browsable/searchable view over every phone the app has *any* data for: the optional "change
 * phone" override path, not the primary (auto-detect) way users see their tap zone. App-level
 * on purpose: browsing the full catalog is this app's UX, not something every host needs.
 *
 * Remote entries win over seed entries for the same device (same lookup key), since remote is
 * the fresher source; badges reflect each entry's real resolved confidence (verified -> EXACT).
 */
export class PhoneCatalogRepository {
  constructor(private readonly seedLoader: BundledSeedCatalogLoader, private readonly remoteApi: CatalogRemoteApi) {}

  async listAll(): Promise<DeviceAntennaProfile[]> {
    const seed = await this.seedLoader.load();
    const seedByKey = new Map(seed.entries.map((e) => [catalogEntryLookupKey(e), e] as const));
    let remoteEntries: typeof seed.entries = [];
    try {
      remoteEntries = (await this.remoteApi.fetchCatalog(0)).entries ?? [];
    } catch {
      // Remote unavailable: the seed alone is a complete answer.
    }
    const remoteByKey = new Map(remoteEntries.map((e) => [catalogEntryLookupKey(e), e] as const));
    const keys = new Set([...seedByKey.keys(), ...remoteByKey.keys()]);
    const profiles: DeviceAntennaProfile[] = [];
    for (const key of keys) {
      const fromRemote = remoteByKey.get(key);
      const dto = fromRemote ?? seedByKey.get(key)!;
      const profile = toDomainOrNull(dto, fromRemote ? 'REMOTE_CATALOG' : 'SEED_CATALOG');
      if (profile) profiles.push(profile);
    }
    return profiles.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.model.localeCompare(b.model));
  }

  async search(query: string): Promise<DeviceAntennaProfile[]> {
    const all = await this.listAll();
    return filterProfiles(all, query);
  }
}

export function matchesQuery(profile: DeviceAntennaProfile, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    profile.manufacturer.toLowerCase().includes(needle) ||
    profile.model.toLowerCase().includes(needle) ||
    friendlyDeviceName(profile.manufacturer, profile.model).toLowerCase().includes(needle)
  );
}

export const filterProfiles = (all: DeviceAntennaProfile[], query: string) => all.filter((p) => matchesQuery(p, query));
