import type { Confidence, DataSource } from './model/enums';
import type { DeviceAntennaProfile, DeviceIdentitySignals } from './model/DeviceAntennaProfile';
import type { DeviceFingerprint } from './model/DeviceFingerprint';

/**
 * Analytics sink the host supplies. The library never bundles or calls a concrete analytics
 * SDK; it only emits these typed events, so the host's own stack stays authoritative.
 */
export interface NfcLocatorAnalytics {
  /**
   * Guidance UI (marker or sweep) was shown.
   * @param confidence confidence level driving the visual state shown.
   * @param source which resolver-chain layer produced the profile.
   * @param formFactor `FormFactor` name of the silhouette shown.
   */
  guidanceShown(confidence: Confidence, source: DataSource, formFactor: string): void;

  /**
   * The user dismissed the guidance before completing an unlock.
   * @param confidence confidence of the guidance that was dismissed.
   * @param timeVisibleMs milliseconds the guidance was on screen before dismissal.
   */
  guidanceDismissed(confidence: Confidence, timeVisibleMs: number): void;

  /**
   * Resolution fell through to the heuristic layer: no device-specific match existed in the
   * Android 14 API, remote catalog, or seed catalog.
   * @param manufacturer normalized manufacturer from the fingerprint.
   * @param formFactorGuess `FormFactor` name heuristically assigned.
   */
  unknownDeviceDetected(manufacturer: string, formFactorGuess: string): void;

  /**
   * A device-specific match was found in the remote or bundled seed catalog.
   * @param confidence `APPROXIMATE`, or `EXACT` for a `verified` entry.
   * @param source `REMOTE_CATALOG` or `SEED_CATALOG`.
   * @param catalogVersion version of the catalog entry that matched.
   */
  catalogMatchFound(confidence: Confidence, source: DataSource, catalogVersion: number): void;

  /**
   * `NfcAdapter#getNfcAntennaInfo()` returned a plausible, validated position (Android 14+
   * only). Distinct from `catalogMatchFound`: on-device OS data rather than a catalog lookup.
   * Never called on iOS; kept so one shared analytics handler serves both platforms.
   * @param antennaCount number of antennas reported for this device.
   */
  android14AntennaDetected(antennaCount: number): void;

  /**
   * Retry guidance was shown after a simulated or real unlock/read failure.
   * @param attemptNumber 1-indexed count of consecutive failures this session.
   * @param confidence confidence of the guidance being re-shown.
   */
  retryGuidanceShown(attemptNumber: number, confidence: Confidence): void;
}

/** Logging sink the host supplies; the library bundles no logging framework. */
export interface NfcLocatorLogger {
  d(tag: string, message: string): void;
  w(tag: string, message: string, error?: unknown): void;
  e(tag: string, message: string, error?: unknown): void;
}

/** Builds the current device's fingerprint. An interface so a phone picker can override it. */
export interface DeviceFingerprintProvider {
  current(): DeviceFingerprint | Promise<DeviceFingerprint>;
}

/**
 * Local cache of catalog entries fetched from the {@link CatalogRemoteApi}. A disposable
 * cache: a schema change simply starts over empty.
 */
export interface CatalogCache {
  /** First cached profile matching any of `lookupKeys` (most specific first), or `null`. */
  find(lookupKeys: readonly string[]): Promise<DeviceAntennaProfile | null>;
  upsertAll(entries: ReadonlyArray<readonly [string, DeviceAntennaProfile]>): Promise<void>;
  /** Highest `catalogVersion` currently cached, or 0 if empty. */
  latestCachedVersion(): Promise<number>;
  listAll(): Promise<DeviceAntennaProfile[]>;
}

/**
 * One link in the resolver chain. Returns `null` for "no usable answer, try the next source";
 * must never return implausible data dressed up as a real profile.
 */
export interface AntennaLocationSource {
  resolve(signals: DeviceIdentitySignals): Promise<DeviceAntennaProfile | null>;
}

export const noopAnalytics: NfcLocatorAnalytics = {
  guidanceShown: () => {},
  guidanceDismissed: () => {},
  unknownDeviceDetected: () => {},
  catalogMatchFound: () => {},
  android14AntennaDetected: () => {},
  retryGuidanceShown: () => {},
};

export const noopLogger: NfcLocatorLogger = {
  d: () => {},
  w: () => {},
  e: () => {},
};
