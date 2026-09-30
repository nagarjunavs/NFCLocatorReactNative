import type {
  NativeAntennaInfo,
  NativeDeviceSignals,
  NativeFoldChangedEvent,
  NativeNfcState,
  NativeSessionEndedEvent,
  NativeTagEvent,
} from './NativeNfcLocator';

/**
 * The native module's surface as JS sees it. Kept as an interface so everything above this
 * seam (signal mapping, tap-session state) is unit-testable against a fake.
 */
export interface NativeNfcLocatorModule {
  getDeviceSignals(): Promise<NativeDeviceSignals>;
  getNfcAntennaInfo(): Promise<NativeAntennaInfo | null>;
  getNfcState(): Promise<NativeNfcState>;
  startTapSession(): Promise<number>;
  stopTapSession(): void;
  openNfcSettings(): Promise<boolean>;
  onNfcStateChanged(listener: (e: NativeNfcState) => void): { remove(): void };
  onFoldChanged(listener: (e: NativeFoldChangedEvent) => void): { remove(): void };
  onTagDiscovered(listener: (e: NativeTagEvent) => void): { remove(): void };
  onTapSessionEnded(listener: (e: NativeSessionEndedEvent) => void): { remove(): void };
}
