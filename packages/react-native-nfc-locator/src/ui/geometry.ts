import {
  TEMPLATE_FOLD_BOOK_CLOSED,
  TEMPLATE_FOLD_BOOK_OPEN,
  TEMPLATE_FOLD_FLIP_CLOSED,
  TEMPLATE_FOLD_FLIP_OPEN,
  TEMPLATE_TABLET,
} from '../domain/model/DeviceAntennaProfile';
import type { NormalizedRect } from '../domain/model/NormalizedRect';

export interface Size {
  width: number;
  height: number;
}

/** Vector silhouette description: aspect ratio + corner radius as a fraction of width. */
export interface SilhouetteSpec {
  kind: 'bar' | 'square' | 'tablet' | 'foldBookOpen';
  aspectRatio: number;
  cornerRadiusFraction: number;
}

const BAR: SilhouetteSpec = { kind: 'bar', aspectRatio: 0.5, cornerRadiusFraction: 0.18 };
const SQUARE: SilhouetteSpec = { kind: 'square', aspectRatio: 0.85, cornerRadiusFraction: 0.22 };
const TABLET: SilhouetteSpec = { kind: 'tablet', aspectRatio: 0.72, cornerRadiusFraction: 0.1 };
const FOLD_BOOK_OPEN: SilhouetteSpec = { kind: 'foldBookOpen', aspectRatio: 1.1, cornerRadiusFraction: 0.08 };

/** Which bundled silhouette to draw for a template id (closed book == a bar, open flip == a bar). */
export function silhouetteSpecFor(templateId: string): SilhouetteSpec {
  switch (templateId) {
    case TEMPLATE_FOLD_BOOK_OPEN:
      return FOLD_BOOK_OPEN;
    case TEMPLATE_FOLD_BOOK_CLOSED:
    case TEMPLATE_FOLD_FLIP_OPEN:
      return BAR;
    case TEMPLATE_FOLD_FLIP_CLOSED:
      return SQUARE;
    case TEMPLATE_TABLET:
      return TABLET;
    default:
      return BAR;
  }
}

/** Largest size with the given width/height ratio that fits inside `bounds`. */
export function fitWithinBounds(bounds: Size, ratio: number): Size {
  const heightForFullWidth = bounds.width / ratio;
  return heightForFullWidth <= bounds.height
    ? { width: bounds.width, height: heightForFullWidth }
    : { width: bounds.height * ratio, height: bounds.height };
}

/** Marker radius: a fixed proportion of the fitted silhouette's width (position varies, size doesn't). */
export const markerRadiusFor = (content: Size): number => content.width * 0.38;

export const zoneCenter = (zone: NormalizedRect, content: Size) => ({
  x: (zone.x + zone.width / 2) * content.width,
  y: (zone.y + zone.height / 2) * content.height,
});

// Ripple: scale 0.6 -> 1.9 (past the ring) while fading out, peak alpha 0.5, restarting
// every 2200ms.
export const RIPPLE_MIN_SCALE = 0.6;
export const RIPPLE_MAX_SCALE = 1.9;
export const RIPPLE_PEAK_ALPHA = 0.5;
export const RIPPLE_DURATION_MS = 2200;
export const SWEEP_DURATION_MS = 1800;
/** Static (reduced motion) glow alpha. */
export const STATIC_GLOW_ALPHA = 0.28;

export function rippleAlpha(scale: number): number {
  const a = ((RIPPLE_MAX_SCALE - scale) / (RIPPLE_MAX_SCALE - RIPPLE_MIN_SCALE)) * RIPPLE_PEAK_ALPHA;
  return Math.min(Math.max(a, 0), RIPPLE_PEAK_ALPHA);
}

/** Camera-module square geometry, as fractions of the fitted silhouette. */
export const CAMERA_BUMP = { x: 0.1154, y: 0.0621, width: 0.1987, height: 0.0917, radiusOfWidth: 0.3548 } as const;
