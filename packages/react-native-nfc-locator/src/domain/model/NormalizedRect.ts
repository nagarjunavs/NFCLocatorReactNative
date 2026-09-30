/**
 * A rectangle expressed as fractions (0..1) of a silhouette template's bounding box, not
 * pixels, so one catalog record renders correctly at any size.
 *
 * Convention every producer must follow: `x`/`y` are relative to the phone's **back** panel,
 * viewed with the back facing the viewer, phone upright in portrait. A source whose raw data
 * is in another frame (e.g. the OS-reported front/screen-facing coordinates read by the
 * Android 14 source) must convert before constructing one.
 */
export interface NormalizedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const EPSILON = 0.001;

function inUnit(v: number): boolean {
  return Number.isFinite(v) && v >= 0 && v <= 1;
}

/** Returns the validation failure message for a rect, or null when valid. */
function validate(x: number, y: number, width: number, height: number): string | null {
  if (!inUnit(x)) return `x must be within 0..1, was ${x}`;
  if (!inUnit(y)) return `y must be within 0..1, was ${y}`;
  if (!inUnit(width)) return `width must be within 0..1, was ${width}`;
  if (!inUnit(height)) return `height must be within 0..1, was ${height}`;
  if (x + width > 1 + EPSILON) return `x + width exceeds 1: x=${x} width=${width}`;
  if (y + height > 1 + EPSILON) return `y + height exceeds 1: y=${y} height=${height}`;
  return null;
}

/** Throwing constructor for trusted input: an invalid rect is a programmer error. */
export function normalizedRect(x: number, y: number, width: number, height: number): NormalizedRect {
  const error = validate(x, y, width, height);
  if (error) throw new RangeError(error);
  return Object.freeze({ x, y, width, height });
}

/** Non-throwing variant for untrusted input (catalog rows): invalid -> `null`, skip the row. */
export function tryNormalizedRect(
  x: number,
  y: number,
  width: number,
  height: number,
): NormalizedRect | null {
  return validate(x, y, width, height) === null ? Object.freeze({ x, y, width, height }) : null;
}

export const centerX = (r: NormalizedRect): number => r.x + r.width / 2;
export const centerY = (r: NormalizedRect): number => r.y + r.height / 2;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** A square zone of the given `side`, centered on the point, clamped to stay inside 0..1. */
export function centeredSquare(cx: number, cy: number, side: number): NormalizedRect {
  const half = side / 2;
  return normalizedRect(
    clamp(cx - half, 0, 1 - side),
    clamp(cy - half, 0, 1 - side),
    side,
    side,
  );
}

export function rectEquals(a: NormalizedRect, b: NormalizedRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
