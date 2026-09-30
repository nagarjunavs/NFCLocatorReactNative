import type { NfcLocatorAnalytics, NfcLocatorLogger } from 'react-native-nfc-locator';

/**
 * Demo sinks that only log. A real host forwards these into its own analytics/logging
 * pipeline; the library never implements them.
 */
export class ConsoleNfcLocatorAnalytics implements NfcLocatorAnalytics {
  guidanceShown(confidence: string, source: string, formFactor: string) {
    log(`guidance_shown confidence=${confidence} source=${source} formFactor=${formFactor}`);
  }
  guidanceDismissed(confidence: string, timeVisibleMs: number) {
    log(`guidance_dismissed confidence=${confidence} timeVisibleMs=${timeVisibleMs}`);
  }
  unknownDeviceDetected(manufacturer: string, formFactorGuess: string) {
    log(`unknown_device_detected manufacturer=${manufacturer} formFactorGuess=${formFactorGuess}`);
  }
  catalogMatchFound(confidence: string, source: string, catalogVersion: number) {
    log(`catalog_match_found confidence=${confidence} source=${source} catalogVersion=${catalogVersion}`);
  }
  android14AntennaDetected(antennaCount: number) {
    log(`android14_antenna_detected antennaCount=${antennaCount}`);
  }
  retryGuidanceShown(attemptNumber: number, confidence: string) {
    log(`retry_guidance_shown attemptNumber=${attemptNumber} confidence=${confidence}`);
  }
}

export class ConsoleNfcLocatorLogger implements NfcLocatorLogger {
  d(tag: string, message: string) {
    if (__DEV__) console.log(`[${tag}] ${message}`);
  }
  w(tag: string, message: string, error?: unknown) {
    console.warn(`[${tag}] ${message}`, error ?? '');
  }
  e(tag: string, message: string, error?: unknown) {
    console.error(`[${tag}] ${message}`, error ?? '');
  }
}

function log(message: string) {
  if (__DEV__) console.log(`[NfcLocatorAnalytics] ${message}`);
}
