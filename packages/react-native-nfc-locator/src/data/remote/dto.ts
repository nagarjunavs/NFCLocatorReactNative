/**
 * Wire contract for a single catalog entry, shared by the remote catalog endpoint and the
 * bundled seed JSON (one shape, one mapper). Field names are a cross-platform/back-end
 * contract and MUST NOT change.
 */
export interface CatalogEntryDto {
  manufacturer: string;
  model: string;
  formFactor: string;
  silhouetteTemplateId: string;
  zoneX: number;
  zoneY: number;
  zoneWidth: number;
  zoneHeight: number;
  catalogVersion: number;
  lastVerifiedAtEpochMs?: number | null;
  /** Real width/height ratio when known. */
  aspectRatio?: number | null;
  /**
   * True when vendor/community-confirmed as measured for this exact model. Maps to
   * `EXACT`; unverified entries map to `APPROXIMATE`. Defaults to false.
   */
  verified?: boolean;
}

/** Envelope returned by the remote catalog endpoint. */
export interface CatalogResponseDto {
  catalogVersion: number;
  entries: CatalogEntryDto[];
}

/** Envelope of the bundled `seed_catalog.json`. */
export interface SeedCatalogDto {
  catalogVersion: number;
  entries: CatalogEntryDto[];
}
