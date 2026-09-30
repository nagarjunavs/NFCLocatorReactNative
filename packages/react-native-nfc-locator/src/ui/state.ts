import type { DeviceAntennaProfile } from '../domain/model/DeviceAntennaProfile';
import { Confidence, type DataSource, type FormFactor } from '../domain/model/enums';
import type { NormalizedRect } from '../domain/model/NormalizedRect';
import type { StringKey } from '../i18n/keys';

/** A catalog entry not re-verified within this window is shown with a "stale" hint. */
export const STALE_AFTER_DAYS = 180;
const DAY_MS = 86_400_000;

/**
 * What the locator screen renders. A UI-shaped projection, not 1:1 with the profile: the
 * variant already encodes which visual treatment applies, so the components never branch on
 * confidence themselves.
 */
export type AntennaLocatorUiState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' }
  | ResolvedMarkerState
  | FallbackGuidanceState;

/** `EXACT` (solid marker) or `APPROXIMATE` (marker + badge + sweep hint when stale). */
export interface ResolvedMarkerState {
  readonly kind: 'resolvedMarker';
  readonly formFactor: FormFactor;
  readonly silhouetteTemplateId: string;
  readonly antennaZone: NormalizedRect;
  readonly confidence: 'EXACT' | 'APPROXIMATE';
  readonly source: DataSource;
  readonly isStale: boolean;
  readonly aspectRatio?: number | null;
}

/** `GENERIC` or `UNKNOWN`. Always rendered as a guided sweep, never a fixed marker. */
export interface FallbackGuidanceState {
  readonly kind: 'fallbackGuidance';
  readonly formFactor: FormFactor;
  readonly silhouetteTemplateId: string;
  readonly approximateZone: NormalizedRect;
  readonly confidence: 'GENERIC' | 'UNKNOWN';
  readonly tipTextKey: StringKey;
  readonly aspectRatio?: number | null;
}

export const LoadingState: AntennaLocatorUiState = Object.freeze({ kind: 'loading' });
export const ErrorState: AntennaLocatorUiState = Object.freeze({ kind: 'error' });

/**
 * Runtime-checked constructors. The types already forbid the illegal combinations; these
 * also throw for untyped callers, so a wrong state fails loudly in development.
 */
export function resolvedMarker(input: Omit<ResolvedMarkerState, 'kind'>): ResolvedMarkerState {
  if (input.confidence !== Confidence.EXACT && input.confidence !== Confidence.APPROXIMATE) {
    throw new Error(`ResolvedMarker must not be built for ${String(input.confidence)}; use FallbackGuidance instead`);
  }
  return Object.freeze({ kind: 'resolvedMarker', ...input });
}

export function fallbackGuidance(input: Omit<FallbackGuidanceState, 'kind'>): FallbackGuidanceState {
  if (input.confidence !== Confidence.GENERIC && input.confidence !== Confidence.UNKNOWN) {
    throw new Error(`FallbackGuidance must not be built for ${String(input.confidence)}; use ResolvedMarker instead`);
  }
  return Object.freeze({ kind: 'fallbackGuidance', ...input });
}

/** True for states where a retry flow should offer sweep guidance. */
export function isGuidedSweep(state: AntennaLocatorUiState): boolean {
  return state.kind === 'fallbackGuidance' || (state.kind === 'resolvedMarker' && state.isStale);
}

/**
 * True only when a solid, confident marker may be drawn: `EXACT`, or `APPROXIMATE` and not
 * stale. The single rule the UI must never violate.
 */
export function showsConfidentMarker(state: AntennaLocatorUiState): boolean {
  return state.kind === 'resolvedMarker' && !state.isStale;
}

function isStale(profile: DeviceAntennaProfile, now: number): boolean {
  if (profile.confidence !== Confidence.APPROXIMATE) return false;
  if (profile.lastVerifiedAtEpochMs == null) return true;
  // Whole days elapsed (truncated), stale strictly beyond the window.
  return Math.trunc((now - profile.lastVerifiedAtEpochMs) / DAY_MS) > STALE_AFTER_DAYS;
}

function tipKeyFor(confidence: Confidence, formFactor: FormFactor): StringKey {
  if (confidence === Confidence.UNKNOWN) return 'nfc_locator_sweep_unknown_tip';
  if (confidence === Confidence.GENERIC) {
    switch (formFactor) {
      case 'BAR':
        return 'nfc_locator_sweep_bar_tip';
      case 'FOLD_BOOK':
        return 'nfc_locator_sweep_fold_book_tip';
      case 'FOLD_FLIP':
        return 'nfc_locator_sweep_fold_flip_tip';
      case 'TABLET':
        return 'nfc_locator_sweep_tablet_tip';
    }
  }
  return 'nfc_locator_sweep_generic_tip';
}

/**
 * Maps a resolved profile to the UI state. The one place confidence decides which visual
 * treatment applies: EXACT/APPROXIMATE get a marker (approximate flagged stale past
 * {@link STALE_AFTER_DAYS}); GENERIC/UNKNOWN always get the guided-sweep fallback.
 */
export function toUiState(profile: DeviceAntennaProfile, now: number = Date.now()): AntennaLocatorUiState {
  switch (profile.confidence) {
    case Confidence.EXACT:
    case Confidence.APPROXIMATE:
      return resolvedMarker({
        formFactor: profile.formFactor,
        silhouetteTemplateId: profile.silhouetteTemplateId,
        antennaZone: profile.antennaZone,
        confidence: profile.confidence,
        source: profile.source,
        isStale: isStale(profile, now),
        aspectRatio: profile.aspectRatio,
      });
    case Confidence.GENERIC:
    case Confidence.UNKNOWN:
      return fallbackGuidance({
        formFactor: profile.formFactor,
        silhouetteTemplateId: profile.silhouetteTemplateId,
        approximateZone: profile.antennaZone,
        confidence: profile.confidence,
        tipTextKey: tipKeyFor(profile.confidence, profile.formFactor),
        aspectRatio: profile.aspectRatio,
      });
  }
}
