// The plugin needs `expo/config-plugins` only at prebuild time, so it is mocked here (virtual):
// the test proves what the plugin writes, not Expo's plumbing.
jest.mock(
  'expo/config-plugins',
  () => ({
    withEntitlementsPlist: (config: any, fn: any) => fn({ ...config, modResults: config.__entitlements ?? {} }),
    withInfoPlist: (config: any, fn: any) => fn({ ...config, modResults: config.__info ?? {} }),
    createRunOncePlugin: (plugin: any) => plugin,
  }),
  { virtual: true },
);

const withNfcLocator = require('../app.plugin.js');

const run = (props?: object, entitlements: object = {}, info: object = {}) => {
  const ent: any = { ...entitlements };
  const inf: any = { ...info };
  const config = { __entitlements: ent, __info: inf } as any;
  withNfcLocator(config, props);
  return { ent, inf };
};

describe('Expo config plugin', () => {
  it('adds the Core NFC reader formats and a usage description by default', () => {
    const { ent, inf } = run();
    expect(ent['com.apple.developer.nfc.readersession.formats']).toEqual(['TAG', 'NDEF']);
    expect(typeof inf.NFCReaderUsageDescription).toBe('string');
    expect(inf.NFCReaderUsageDescription.length).toBeGreaterThan(20);
  });
  it('honors host-supplied formats and usage text', () => {
    const { ent, inf } = run({ readerSessionFormats: ['TAG'], nfcReaderUsageDescription: 'Custom text' });
    expect(ent['com.apple.developer.nfc.readersession.formats']).toEqual(['TAG']);
    expect(inf.NFCReaderUsageDescription).toBe('Custom text');
  });
  it('never overwrites a usage description the app already set', () => {
    const { inf } = run(undefined, {}, { NFCReaderUsageDescription: 'Already set' });
    expect(inf.NFCReaderUsageDescription).toBe('Already set');
  });
});
