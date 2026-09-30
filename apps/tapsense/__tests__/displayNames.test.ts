import { friendlyDeviceName, friendlyManufacturerName, friendlyModelName, toDisplayDeviceName } from '../src/util/displayNames';

describe('displayNames', () => {
  it('capitalizes after every delimiter', () => {
    expect(toDisplayDeviceName('sdk_gphone64_arm64')).toBe('Sdk Gphone64 Arm64');
    expect(toDisplayDeviceName('sm-a546b')).toBe('Sm-A546b');
    // The capitalize-next flag survives leading digits, so the first letter after them is upper-cased.
    expect(toDisplayDeviceName('24031pn0dc')).toBe('24031Pn0dc');
  });
  it('uses marketing names for catalog SKUs and falls back for unknown models', () => {
    expect(friendlyModelName('sm-s918b')).toBe('Galaxy S23 Ultra');
    expect(friendlyModelName('iphone15,2')).toBe('iPhone 14 Pro');
    expect(friendlyModelName('acme_widget')).toBe('Acme Widget');
    expect(friendlyManufacturerName('samsung')).toBe('Samsung');
    expect(friendlyDeviceName('google', 'pixel 8')).toBe('Google Pixel 8');
  });
});
