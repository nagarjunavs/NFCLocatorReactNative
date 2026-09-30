/** Raw, un-validated `NfcAntennaInfo` as reported by the OS (device-space, typically mm). */
export interface RawNfcAntennaInfo {
  deviceWidth: number;
  deviceHeight: number;
  antennas: ReadonlyArray<{ locationX: number; locationY: number }>;
}

/**
 * OS boundary around `NfcAdapter#getNfcAntennaInfo()`. The native implementation must return
 * `null` for anything unsupported/failing (API < 34, null OEM result, thrown exception).
 */
export interface NfcAntennaInfoProvider {
  getAntennaInfo(): Promise<RawNfcAntennaInfo | null>;
}
