import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Raw platform signals. Enum-like fields are plain strings (Codegen has no enums) and are
 * validated/normalized on the JS side. The native side never decides confidence or catalog
 * matches; it only reports what JS cannot know.
 */
export type NativeDeviceSignals = {
  /** Raw `Build.MANUFACTURER` (Android) / `"apple"` (iOS). Normalized in JS. */
  manufacturer: string;
  brand: string;
  /** Raw `Build.MODEL` (Android) / `hw.machine` e.g. `iPhone15,2` (iOS). */
  model: string;
  device: string;
  product: string;
  /** `Build.SKU` on Android 12+, otherwise absent. */
  sku?: string;
  /** `BAR` | `FOLD_BOOK` | `FOLD_FLIP` | `TABLET` */
  formFactor: string;
  /** `NOT_APPLICABLE` | `FOLDED` | `UNFOLDED` */
  foldState: string;
  /** `COMPACT` | `MEDIUM` | `EXPANDED` */
  screenSizeClass: string;
  /** Android API level >= 34 (false on iOS). */
  isAndroid14ApiAvailable: boolean;
};

export type NativeAntenna = { locationX: number; locationY: number };

export type NativeAntennaInfo = {
  deviceWidth: number;
  deviceHeight: number;
  antennas: NativeAntenna[];
};

export type NativeNfcState = {
  /** Device has NFC hardware and (iOS) can run reader sessions. */
  isSupported: boolean;
  /** Android: adapter enabled. iOS has no user-facing toggle, so this equals `isSupported`. */
  isEnabled: boolean;
  /** Whether {@link Spec.openNfcSettings} can do anything on this platform/device. */
  canOpenSettings: boolean;
};

export type NativeTagEvent = { sessionId: number };

export type NativeSessionEndedEvent = {
  sessionId: number;
  /**
   * True only if the session genuinely ran (iOS: the system sheet appeared; Android: reader
   * mode was armed). False means it was rejected before starting, on iOS almost always an
   * entitlement/provisioning problem, not "no tag was presented".
   */
  becameActive: boolean;
  /** Platform error domain/code, e.g. `NFCReaderError:201`; empty when none. */
  code: string;
  message: string;
};

export type NativeFoldChangedEvent = { formFactor: string; foldState: string };

export interface Spec extends TurboModule {
  getDeviceSignals(): Promise<NativeDeviceSignals>;
  /** `null` for API < 34, no NFC, an OEM null result or any thrown OEM error. Never rejects. */
  getNfcAntennaInfo(): Promise<NativeAntennaInfo | null>;
  getNfcState(): Promise<NativeNfcState>;
  /**
   * Arms a tap-detection session. Resolves with a positive session id, or `0` if a session
   * could not be started (no NFC, NFC off, no foreground activity, OEM failure).
   */
  startTapSession(): Promise<number>;
  stopTapSession(): void;
  /** Resolves `false` if there is nothing to open (no NFC hardware, or iOS). */
  openNfcSettings(): Promise<boolean>;

  readonly onNfcStateChanged: CodegenTypes.EventEmitter<NativeNfcState>;
  readonly onFoldChanged: CodegenTypes.EventEmitter<NativeFoldChangedEvent>;
  readonly onTagDiscovered: CodegenTypes.EventEmitter<NativeTagEvent>;
  readonly onTapSessionEnded: CodegenTypes.EventEmitter<NativeSessionEndedEvent>;
}

export default TurboModuleRegistry.get<Spec>('NfcLocator');
