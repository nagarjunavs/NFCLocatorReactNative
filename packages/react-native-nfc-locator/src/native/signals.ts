import {
  deviceFingerprintFromRaw,
  type DeviceIdentitySignals,
  isFormFactor,
  type FoldState,
  type ScreenSizeClass,
} from '../domain/model';
import type { NfcAntennaInfoProvider, RawNfcAntennaInfo } from '../data/android14/types';
import type { NfcLocatorLogger } from '../domain/seams';
import type { NativeAntennaInfo, NativeDeviceSignals } from './NativeNfcLocator';
import type { NativeNfcLocatorModule } from './platform';

const FOLD_STATES: readonly string[] = ['NOT_APPLICABLE', 'FOLDED', 'UNFOLDED'];
const SCREEN_CLASSES: readonly string[] = ['COMPACT', 'MEDIUM', 'EXPANDED'];

/** Signals used when no native module is available (not linked, Expo Go, unit tests). */
export const UNAVAILABLE_SIGNALS: DeviceIdentitySignals = Object.freeze({
  fingerprint: deviceFingerprintFromRaw({ manufacturer: 'unknown', brand: 'unknown', model: 'unknown', device: 'unknown', product: 'unknown' }),
  formFactor: 'BAR',
  foldState: 'NOT_APPLICABLE',
  screenSizeClass: 'COMPACT',
  isAndroid14ApiAvailable: false,
});

/** Validates raw native signals into the domain type, defaulting any unrecognized enum. */
export function mapNativeSignals(raw: NativeDeviceSignals): DeviceIdentitySignals {
  return {
    fingerprint: deviceFingerprintFromRaw(raw),
    formFactor: isFormFactor(raw.formFactor) ? raw.formFactor : 'BAR',
    foldState: (FOLD_STATES.includes(raw.foldState) ? raw.foldState : 'NOT_APPLICABLE') as FoldState,
    screenSizeClass: (SCREEN_CLASSES.includes(raw.screenSizeClass) ? raw.screenSizeClass : 'COMPACT') as ScreenSizeClass,
    isAndroid14ApiAvailable: raw.isAndroid14ApiAvailable === true,
  };
}

/** Reads the running device's signals; never rejects (falls back to {@link UNAVAILABLE_SIGNALS}). */
export async function readDeviceSignals(
  native: NativeNfcLocatorModule | null,
  logger?: NfcLocatorLogger,
): Promise<DeviceIdentitySignals> {
  if (!native) return UNAVAILABLE_SIGNALS;
  try {
    return mapNativeSignals(await native.getDeviceSignals());
  } catch (e) {
    logger?.w('NfcLocatorSignals', 'getDeviceSignals failed, using unavailable signals', e);
    return UNAVAILABLE_SIGNALS;
  }
}

/** Adapts the native module to the resolver chain's Android 14 seam. */
export function createNativeAntennaInfoProvider(native: NativeNfcLocatorModule): NfcAntennaInfoProvider {
  return {
    async getAntennaInfo(): Promise<RawNfcAntennaInfo | null> {
      const info: NativeAntennaInfo | null = await native.getNfcAntennaInfo();
      if (!info || !Array.isArray(info.antennas)) return null;
      return { deviceWidth: info.deviceWidth, deviceHeight: info.deviceHeight, antennas: info.antennas };
    },
  };
}
