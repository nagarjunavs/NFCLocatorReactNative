import { centeredSquare, type NormalizedRect } from '../../domain/model/NormalizedRect';
import type { RawNfcAntennaInfo } from './types';

/** Drawn zone size around a point reading, as a fraction of device width/height. */
export const ANTENNA_MARKER_FRACTION = 0.12;

/**
 * Converts a single OEM-reported antenna position into normalized coordinates, or `null` if
 * the reading is implausible. Guards the failure modes OEMs are known to hit: zero/negative
 * device bounds, a location outside the device's own bounds, and NaN/Infinity.
 */
export function toNormalizedZoneOrNull(info: RawNfcAntennaInfo, antennaIndex: number): NormalizedRect | null {
  const { deviceWidth: width, deviceHeight: height } = info;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const antenna = info.antennas[antennaIndex];
  if (!antenna) return null;
  const { locationX: x, locationY: y } = antenna;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Reject out-of-bounds readings (also catches a (0,0) stub on a tiny device).
  if (x < 0 || y < 0 || x > width || y > height) return null;
  const fx = x / width;
  const fy = y / height;
  if (!Number.isFinite(fx) || !Number.isFinite(fy)) return null;
  // NfcAntennaInfo is in the device's front (screen-facing) frame, but every silhouette draws
  // the BACK panel; flipping the phone over swaps left/right, so mirror X. Y is unaffected.
  return centeredSquare(clamp01(1 - fx), clamp01(fy), ANTENNA_MARKER_FRACTION);
}

const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1);
