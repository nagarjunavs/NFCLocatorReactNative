import { type CatalogEntryDto, catalogEntryLookupKey, toDomainOrNull } from '../src';

const valid = (): CatalogEntryDto => ({
  manufacturer: 'google',
  model: 'pixel 8',
  formFactor: 'BAR',
  silhouetteTemplateId: 'silhouette_bar',
  zoneX: 0.3,
  zoneY: 0.2,
  zoneWidth: 0.4,
  zoneHeight: 0.14,
  catalogVersion: 1,
  lastVerifiedAtEpochMs: 1_700_000_000_000,
});

describe('CatalogEntryMapper', () => {
  it('maps an unverified entry to APPROXIMATE', () => {
    const r = toDomainOrNull(valid(), 'REMOTE_CATALOG');
    expect(r?.confidence).toBe('APPROXIMATE');
    expect(r?.source).toBe('REMOTE_CATALOG');
    expect(r?.formFactor).toBe('BAR');
    expect(r?.lastVerifiedAtEpochMs).toBe(1_700_000_000_000);
  });
  it('maps a verified entry to EXACT', () => {
    expect(toDomainOrNull({ ...valid(), verified: true }, 'REMOTE_CATALOG')?.confidence).toBe('EXACT');
  });
  it('verified defaults to false when omitted', () => {
    expect(toDomainOrNull(valid(), 'SEED_CATALOG')?.confidence).toBe('APPROXIMATE');
  });
  it('rejects an unrecognized form factor (case-sensitive)', () => {
    expect(toDomainOrNull({ ...valid(), formFactor: 'SPHERE' }, 'REMOTE_CATALOG')).toBeNull();
    expect(toDomainOrNull({ ...valid(), formFactor: 'bar' }, 'REMOTE_CATALOG')).toBeNull();
  });
  it('rejects a zone that exceeds normalized bounds', () => {
    expect(toDomainOrNull({ ...valid(), zoneWidth: 1.5 }, 'REMOTE_CATALOG')).toBeNull();
  });
  it('rejects a negative zone coordinate', () => {
    expect(toDomainOrNull({ ...valid(), zoneX: -0.1 }, 'REMOTE_CATALOG')).toBeNull();
  });
  it('rejects a blank manufacturer, model or template id', () => {
    expect(toDomainOrNull({ ...valid(), manufacturer: '' }, 'REMOTE_CATALOG')).toBeNull();
    expect(toDomainOrNull({ ...valid(), model: '  ' }, 'REMOTE_CATALOG')).toBeNull();
    expect(toDomainOrNull({ ...valid(), silhouetteTemplateId: '' }, 'REMOTE_CATALOG')).toBeNull();
  });
  it('rejects a negative catalog version', () => {
    expect(toDomainOrNull({ ...valid(), catalogVersion: -1 }, 'REMOTE_CATALOG')).toBeNull();
  });
  it('tolerates untrusted JSON: wrong types and null rows are skipped, not thrown', () => {
    expect(toDomainOrNull({ ...valid(), zoneX: '0.3' as unknown as number }, 'REMOTE_CATALOG')).toBeNull();
    expect(toDomainOrNull(null as unknown as CatalogEntryDto, 'REMOTE_CATALOG')).toBeNull();
  });
  it('lookupKey normalizes manufacturer and model consistently with the fingerprint', () => {
    expect(catalogEntryLookupKey(valid())).toBe('google:pixel_8');
  });
});
