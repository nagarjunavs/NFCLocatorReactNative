import { normalizeFingerprintField } from '../domain/model/DeviceFingerprint';

/** `manufacturer:model`, both normalized exactly as the fingerprint side normalizes them. */
export function deviceFingerprintKey(manufacturer: string, model: string): string {
  return `${normalizeFingerprintField(manufacturer)}:${normalizeFingerprintField(model)}`;
}
