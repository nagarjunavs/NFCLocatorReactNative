import type { CatalogResponseDto } from './dto';

/**
 * Network boundary the host implements with its own networking stack. The library never
 * performs an HTTP call. Throw on transport/parsing failure: any exception is treated as
 * "remote unavailable, fall through" and never shown to the user.
 */
export interface CatalogRemoteApi {
  /** Entries added/updated since `sinceVersion` (0 for a full sync). */
  fetchCatalog(sinceVersion: number): Promise<CatalogResponseDto>;
}
