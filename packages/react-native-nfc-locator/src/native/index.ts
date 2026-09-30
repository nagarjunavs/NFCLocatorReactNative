import { Platform } from 'react-native';
import NativeModule from './NativeNfcLocator';
import type { NativeNfcLocatorModule } from './platform';

export * from './platform';
export * from './signals';
export * from './tapReader';
export type {
  NativeAntennaInfo,
  NativeDeviceSignals,
  NativeFoldChangedEvent,
  NativeNfcState,
  NativeSessionEndedEvent,
  NativeTagEvent,
} from './NativeNfcLocator';

/** The linked native module wrapped for JS, or `null` when not linked (Expo Go, web, tests). */
export function getNativeModule(): NativeNfcLocatorModule | null {
  const m = NativeModule;
  if (!m) return null;
  return {
    getDeviceSignals: () => m.getDeviceSignals(),
    getNfcAntennaInfo: () => m.getNfcAntennaInfo(),
    getNfcState: () => m.getNfcState(),
    startTapSession: () => m.startTapSession(),
    stopTapSession: () => m.stopTapSession(),
    openNfcSettings: () => m.openNfcSettings(),
    onNfcStateChanged: (l) => m.onNfcStateChanged(l),
    onFoldChanged: (l) => m.onFoldChanged(l),
    onTagDiscovered: (l) => m.onTagDiscovered(l),
    onTapSessionEnded: (l) => m.onTapSessionEnded(l),
  };
}

/** True on platforms with an OS antenna API (Android). iOS runs the 3-layer chain. */
export const platformHasOsAntennaApi: boolean = Platform.OS === 'android';
