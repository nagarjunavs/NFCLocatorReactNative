/**
 * Normalized device identity used as the catalog lookup key.
 *
 * Fields are pre-normalized by the producer (lowercase, `_`-separated) so callers never need
 * to re-normalize before a lookup. {@link lookupKeys} returns candidates from most to least
 * specific (SKU variant first, bare model, then codenames) so regional/carrier variants
 * degrade gracefully to the base model instead of missing the catalog.
 */
export interface DeviceFingerprint {
  readonly manufacturer: string;
  readonly brand: string;
  readonly model: string;
  readonly device: string;
  readonly product: string;
  readonly sku: string | null;
}

/** lowercase, trim, collapse every run of non `[a-z0-9]` to `_`, trim `_`. */
export function normalizeFingerprintField(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function deviceFingerprint(
  manufacturer: string,
  brand: string,
  model: string,
  device: string,
  product: string,
  sku: string | null = null,
): DeviceFingerprint {
  return Object.freeze({ manufacturer, brand, model, device, product, sku });
}

/** Builds a fingerprint from raw (un-normalized) platform strings. */
export function deviceFingerprintFromRaw(raw: {
  manufacturer?: string | null;
  brand?: string | null;
  model?: string | null;
  device?: string | null;
  product?: string | null;
  sku?: string | null;
}): DeviceFingerprint {
  const skuNorm = raw.sku && raw.sku.trim() && raw.sku !== 'unknown' ? normalizeFingerprintField(raw.sku) : null;
  return deviceFingerprint(
    normalizeFingerprintField(raw.manufacturer ?? ''),
    normalizeFingerprintField(raw.brand ?? ''),
    normalizeFingerprintField(raw.model ?? ''),
    normalizeFingerprintField(raw.device ?? ''),
    normalizeFingerprintField(raw.product ?? ''),
    skuNorm || null,
  );
}

/** Candidate catalog keys, most specific first. Always non-empty, never duplicated. */
export function lookupKeys(fp: DeviceFingerprint): string[] {
  const keys: string[] = [];
  if (fp.sku && fp.sku.trim()) keys.push(`${fp.manufacturer}:${fp.model}:${fp.sku}`);
  keys.push(`${fp.manufacturer}:${fp.model}`);
  keys.push(`${fp.manufacturer}:${fp.device}`);
  keys.push(`${fp.manufacturer}:${fp.product}`);
  return [...new Set(keys)];
}
