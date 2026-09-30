import { UNAVAILABLE_SIGNALS, createNativeAntennaInfoProvider, lookupKeys, mapNativeSignals, readDeviceSignals, type NativeNfcLocatorModule } from '../src';

describe('native signal mapping', () => {
  it('maps raw Android signals to a normalized fingerprint', () => {
    const s = mapNativeSignals({ manufacturer: 'Google', brand: 'google', model: 'Pixel 8', device: 'shiba', product: 'shiba', formFactor: 'BAR', foldState: 'NOT_APPLICABLE', screenSizeClass: 'COMPACT', isAndroid14ApiAvailable: true });
    expect(lookupKeys(s.fingerprint)).toEqual(['google:pixel_8', 'google:shiba']);
    expect(s.isAndroid14ApiAvailable).toBe(true);
  });
  it('maps a raw iOS hw.machine identifier to the catalog key', () => {
    const s = mapNativeSignals({ manufacturer: 'apple', brand: 'apple', model: 'iPhone15,2', device: 'iPhone15,2', product: 'iPhone15,2', formFactor: 'BAR', foldState: 'NOT_APPLICABLE', screenSizeClass: 'COMPACT', isAndroid14ApiAvailable: false });
    expect(lookupKeys(s.fingerprint)[0]).toBe('apple:iphone15_2');
  });
  it('defaults unrecognized enum strings instead of trusting native', () => {
    const s = mapNativeSignals({ manufacturer: 'a', brand: 'a', model: 'b', device: 'c', product: 'd', formFactor: 'SPHERE', foldState: 'HALF', screenSizeClass: 'HUGE', isAndroid14ApiAvailable: false });
    expect([s.formFactor, s.foldState, s.screenSizeClass]).toEqual(['BAR', 'NOT_APPLICABLE', 'COMPACT']);
  });
  it('passes sku through normalized', () => {
    const s = mapNativeSignals({ manufacturer: 'samsung', brand: 'samsung', model: 'SM-S918B', device: 'dm3q', product: 'dm3qxxx', sku: 'EU-Open', formFactor: 'BAR', foldState: 'NOT_APPLICABLE', screenSizeClass: 'COMPACT', isAndroid14ApiAvailable: true });
    expect(lookupKeys(s.fingerprint)[0]).toBe('samsung:sm_s918b:eu_open');
  });
  it('readDeviceSignals never rejects: missing module or native failure -> unavailable signals', async () => {
    expect(await readDeviceSignals(null)).toBe(UNAVAILABLE_SIGNALS);
    const boom = { getDeviceSignals: async () => { throw new Error('x'); } } as unknown as NativeNfcLocatorModule;
    expect(await readDeviceSignals(boom)).toBe(UNAVAILABLE_SIGNALS);
  });
  it('antenna provider passes the raw reading through and turns null into null', async () => {
    const raw = { deviceWidth: 100, deviceHeight: 200, antennas: [{ locationX: 1, locationY: 2 }] };
    const m = (v: unknown) => ({ getNfcAntennaInfo: async () => v }) as unknown as NativeNfcLocatorModule;
    expect(await createNativeAntennaInfoProvider(m(raw)).getAntennaInfo()).toEqual(raw);
    expect(await createNativeAntennaInfoProvider(m(null)).getAntennaInfo()).toBeNull();
  });
});
