// Expo config plugin: adds what a host needs for NFC. Android's NFC permission and
// uses-feature are merged from this library's own manifest, so only iOS needs work here.
const { withEntitlementsPlist, withInfoPlist, createRunOncePlugin } = require('expo/config-plugins');

const pkg = require('../package.json');
const DEFAULT_USAGE =
  'This app uses NFC to detect when your phone taps an NFC tag or reader, so it can confirm your tap area works.';

/**
 * @param {import('@expo/config-plugins').ExportedConfig} config
 * @param {{ nfcReaderUsageDescription?: string, readerSessionFormats?: string[] }} [props]
 */
function withNfcLocator(config, props = {}) {
  const formats = props.readerSessionFormats ?? ['TAG', 'NDEF'];
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.nfc.readersession.formats'] = formats;
    return c;
  });
  config = withInfoPlist(config, (c) => {
    c.modResults.NFCReaderUsageDescription = props.nfcReaderUsageDescription ?? c.modResults.NFCReaderUsageDescription ?? DEFAULT_USAGE;
    return c;
  });
  return config;
}

module.exports = createRunOncePlugin(withNfcLocator, pkg.name, pkg.version);
