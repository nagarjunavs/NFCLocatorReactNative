import { deviceFingerprintKey } from '../keys';
import { Confidence, type DataSource, isFormFactor } from '../../domain/model/enums';
import type { DeviceAntennaProfile } from '../../domain/model/DeviceAntennaProfile';
import { tryNormalizedRect } from '../../domain/model/NormalizedRect';
import type { CatalogEntryDto } from './dto';

const isNonBlankString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Shared DTO -> domain mapping for the remote catalog and the bundled seed. Returns `null`
 * (never throws) for a structurally invalid entry so one corrupt row can't take down a whole
 * catalog fetch/load. The input is untrusted JSON, so every field is type-checked.
 */
export function toDomainOrNull(dto: CatalogEntryDto, source: DataSource): DeviceAntennaProfile | null {
  if (dto == null || typeof dto !== 'object') return null;
  if (!isFormFactor(dto.formFactor)) return null;
  if (!isNonBlankString(dto.manufacturer) || !isNonBlankString(dto.model)) return null;
  if (!isNonBlankString(dto.silhouetteTemplateId)) return null;
  if (typeof dto.catalogVersion !== 'number' || !Number.isFinite(dto.catalogVersion) || dto.catalogVersion < 0) {
    return null;
  }
  if (
    typeof dto.zoneX !== 'number' ||
    typeof dto.zoneY !== 'number' ||
    typeof dto.zoneWidth !== 'number' ||
    typeof dto.zoneHeight !== 'number'
  ) {
    return null;
  }
  const rect = tryNormalizedRect(dto.zoneX, dto.zoneY, dto.zoneWidth, dto.zoneHeight);
  if (!rect) return null;
  const verifiedAt = dto.lastVerifiedAtEpochMs;
  return {
    manufacturer: dto.manufacturer,
    model: dto.model,
    formFactor: dto.formFactor,
    silhouetteTemplateId: dto.silhouetteTemplateId,
    antennaZone: rect,
    // A verified entry is vendor/community-confirmed for this exact model: the same trust
    // tier as an on-device Android 14 reading, so it earns EXACT.
    confidence: dto.verified === true ? Confidence.EXACT : Confidence.APPROXIMATE,
    source,
    catalogVersion: dto.catalogVersion,
    lastVerifiedAtEpochMs: typeof verifiedAt === 'number' && Number.isFinite(verifiedAt) ? verifiedAt : null,
    aspectRatio: typeof dto.aspectRatio === 'number' && Number.isFinite(dto.aspectRatio) ? dto.aspectRatio : null,
  };
}

/** Lookup key this entry is stored under; matches the keys `lookupKeys(fingerprint)` produces. */
export function catalogEntryLookupKey(dto: Pick<CatalogEntryDto, 'manufacturer' | 'model'>): string {
  return deviceFingerprintKey(dto.manufacturer, dto.model);
}
