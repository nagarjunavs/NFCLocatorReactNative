import { Platform } from 'react-native';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import {
  BundledSeedCatalogLoader,
  KeyValueCatalogCache,
  createNativeAntennaInfoProvider,
  createNativeTapReader,
  createNfcLocator,
  deviceFingerprintFromRaw,
  getNativeModule,
  readDeviceSignals,
  type DeviceIdentitySignals,
  type KeyValueStorage,
  type NativeNfcLocatorModule,
  type NfcLocator,
  type TapReaderController,
} from 'react-native-nfc-locator';
import { ConsoleNfcLocatorAnalytics, ConsoleNfcLocatorLogger } from './analytics/consoleAdapters';
import { PhoneCatalogRepository } from './data/PhoneCatalogRepository';
import { SettingsStore, type TapSenseSettings } from './data/settings';
import { FakeCatalogRemoteApi } from './fake/FakeCatalogRemoteApi';

/**
 * Manual composition root (plain constructors, no DI framework). Everything the library needs
 * from a host is supplied here: the remote catalog seam (a local fake for the demo), analytics
 * and logging sinks, a persistent catalog cache, and the native signal provider.
 */
export interface AppEnvironment {
  native: NativeNfcLocatorModule | null;
  logger: ConsoleNfcLocatorLogger;
  locator: NfcLocator;
  settings: SettingsStore;
  catalog: PhoneCatalogRepository;
  createTapReader: () => TapReaderController | null;
  autoDetectSignals: () => Promise<DeviceIdentitySignals>;
  signalsFor: (settings: TapSenseSettings) => Promise<DeviceIdentitySignals>;
}

const asKeyValue = (db: string): KeyValueStorage => {
  const s = createAsyncStorage(db);
  return { getItem: (k) => s.getItem(k), setItem: (k, v) => s.setItem(k, v) };
};

export function createAppEnvironment(): AppEnvironment {
  const native = getNativeModule();
  const logger = new ConsoleNfcLocatorLogger();
  const remoteApi = new FakeCatalogRemoteApi();
  const locator = createNfcLocator({
    remoteApi,
    analytics: new ConsoleNfcLocatorAnalytics(),
    logger,
    cache: new KeyValueCatalogCache(asKeyValue('tapsense-catalog-cache')),
    // Android has an OS antenna API (layer 1); iOS runs the 3-layer chain.
    antennaInfoProvider: Platform.OS === 'android' && native ? createNativeAntennaInfoProvider(native) : undefined,
  });
  const autoDetectSignals = () => readDeviceSignals(native, logger);

  /**
   * The real running device by default, or a synthetic fingerprint for a manually-picked phone.
   * A manual pick can never claim isAndroid14ApiAvailable: that API only reports the physical
   * unit the app runs on, never an arbitrary chosen model.
   */
  const signalsFor = async (s: TapSenseSettings): Promise<DeviceIdentitySignals> => {
    if (s.selectedPhoneManufacturer == null || s.selectedPhoneModel == null || s.selectedPhoneFormFactor == null) {
      return autoDetectSignals();
    }
    const fingerprint = deviceFingerprintFromRaw({
      manufacturer: s.selectedPhoneManufacturer, brand: s.selectedPhoneManufacturer,
      model: s.selectedPhoneModel, device: s.selectedPhoneModel, product: s.selectedPhoneModel,
    });
    return { fingerprint, formFactor: s.selectedPhoneFormFactor, foldState: 'NOT_APPLICABLE', screenSizeClass: 'COMPACT', isAndroid14ApiAvailable: false };
  };

  return {
    native,
    logger,
    locator,
    settings: new SettingsStore(asKeyValue('tapsense-settings')),
    catalog: new PhoneCatalogRepository(new BundledSeedCatalogLoader(logger), remoteApi),
    createTapReader: () => (native ? createNativeTapReader(native) : null),
    autoDetectSignals,
    signalsFor,
  };
}
