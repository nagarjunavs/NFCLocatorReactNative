import type { Confidence, DataSource, FoldState, FormFactor, ScreenSizeClass } from './enums';
import type { DeviceFingerprint } from './DeviceFingerprint';
import type { NormalizedRect } from './NormalizedRect';

export const TEMPLATE_BAR = 'silhouette_bar';
export const TEMPLATE_FOLD_BOOK_OPEN = 'silhouette_fold_book_open';
export const TEMPLATE_FOLD_BOOK_CLOSED = 'silhouette_fold_book_closed';
export const TEMPLATE_FOLD_FLIP_OPEN = 'silhouette_fold_flip_open';
export const TEMPLATE_FOLD_FLIP_CLOSED = 'silhouette_fold_flip_closed';
export const TEMPLATE_TABLET = 'silhouette_tablet';

/**
 * A resolved (or heuristically guessed) NFC antenna location for a device. Never presented to
 * the UI without `confidence` and `source` attached: never silently present a guess as fact.
 */
export interface DeviceAntennaProfile {
  readonly manufacturer: string;
  readonly model: string;
  readonly formFactor: FormFactor;
  readonly silhouetteTemplateId: string;
  readonly antennaZone: NormalizedRect;
  readonly confidence: Confidence;
  readonly source: DataSource;
  readonly catalogVersion: number;
  /** Epoch milliseconds; `null` when never verified. */
  readonly lastVerifiedAtEpochMs: number | null;
  /** Real width/height ratio when known; `null`/absent falls back to the template ratio. */
  readonly aspectRatio?: number | null;
}

/**
 * Everything the resolver chain needs about the current device. `formFactor`/`foldState` are
 * supplied by the platform layer; the host may override them (e.g. the phone picker).
 */
export interface DeviceIdentitySignals {
  readonly fingerprint: DeviceFingerprint;
  readonly formFactor: FormFactor;
  readonly foldState: FoldState;
  readonly screenSizeClass: ScreenSizeClass;
  readonly isAndroid14ApiAvailable: boolean;
}

/** Which bundled silhouette to render for a form factor + fold state combination. */
export function toSilhouetteTemplateId(formFactor: FormFactor, foldState: FoldState): string {
  switch (formFactor) {
    case 'BAR':
      return TEMPLATE_BAR;
    case 'TABLET':
      return TEMPLATE_TABLET;
    case 'FOLD_BOOK':
      return foldState === 'FOLDED' ? TEMPLATE_FOLD_BOOK_CLOSED : TEMPLATE_FOLD_BOOK_OPEN;
    case 'FOLD_FLIP':
      return foldState === 'FOLDED' ? TEMPLATE_FOLD_FLIP_CLOSED : TEMPLATE_FOLD_FLIP_OPEN;
  }
}
