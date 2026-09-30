import { deviceFingerprint, deviceFingerprintFromRaw, lookupKeys, normalizeFingerprintField as normalize } from '../src';

describe('DeviceFingerprint', () => {
  it('normalize lowercases and strips punctuation and whitespace', () => {
    expect(normalize('SM-S918B')).toBe('sm_s918b');
    expect(normalize('  Pixel 8 Pro  ')).toBe('pixel_8_pro');
    // iOS hw.machine form lands on the same key as a catalog entry authored "iphone15,2".
    expect(normalize('iPhone15,2')).toBe('iphone15_2');
  });

  it('normalize collapses repeated separators and trims leading/trailing underscores', () => {
    expect(normalize('--Pixel--Fold--')).toBe('pixel_fold');
  });

  it('lookupKeys puts the sku variant first when present', () => {
    const fp = deviceFingerprint('samsung', 'samsung', 'sm_s918b', 'dm3q', 'dm3qxxx', 'eu_open');
    const keys = lookupKeys(fp);
    expect(keys[0]).toBe('samsung:sm_s918b:eu_open');
    expect(keys).toContain('samsung:sm_s918b');
  });

  it('lookupKeys falls back to device and product codenames without a sku', () => {
    const fp = deviceFingerprint('google', 'google', 'pixel_8', 'shiba', 'shiba', null);
    expect(lookupKeys(fp)).toEqual(['google:pixel_8', 'google:shiba']);
  });

  it('duplicate model names across manufacturers produce distinct lookup keys', () => {
    const a = deviceFingerprint('acme', 'acme', 'note', 'note_d', 'note_p', null);
    const b = deviceFingerprint('globex', 'globex', 'note', 'note_d', 'note_p', null);
    expect(lookupKeys(a)[0]).not.toBe(lookupKeys(b)[0]);
  });

  it('regional sku variants of one base model both fall back to the base model key', () => {
    const eu = deviceFingerprint('samsung', 'samsung', 'sm_s918b', 'dm3q', 'dm3qxxx', 'eu_open');
    const us = deviceFingerprint('samsung', 'samsung', 'sm_s918b', 'dm3q', 'dm3qxxx', 'us_carrier');
    expect(lookupKeys(eu)[0]).not.toBe(lookupKeys(us)[0]);
    expect(lookupKeys(eu)).toContain('samsung:sm_s918b');
    expect(lookupKeys(us)).toContain('samsung:sm_s918b');
  });

  it('never returns duplicate keys when device and product codenames match', () => {
    const fp = deviceFingerprint('google', 'google', 'pixel_8', 'shiba', 'shiba', null);
    const keys = lookupKeys(fp);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('fromRaw normalizes every field and drops an "unknown"/blank sku', () => {
    const fp = deviceFingerprintFromRaw({
      manufacturer: 'Samsung', brand: 'samsung', model: 'SM-S918B', device: 'dm3q', product: 'dm3qxxx', sku: 'unknown',
    });
    expect(fp.model).toBe('sm_s918b');
    expect(fp.sku).toBeNull();
    expect(deviceFingerprintFromRaw({ sku: '  ' }).sku).toBeNull();
    expect(deviceFingerprintFromRaw({ sku: 'EU-Open' }).sku).toBe('eu_open');
  });

  it('a raw iOS hw.machine identifier matches the catalog-side key', () => {
    const fp = deviceFingerprintFromRaw({ manufacturer: 'apple', brand: 'apple', model: 'iPhone15,2', device: 'iPhone15,2', product: 'iPhone15,2' });
    expect(lookupKeys(fp)[0]).toBe('apple:iphone15_2');
  });
});
