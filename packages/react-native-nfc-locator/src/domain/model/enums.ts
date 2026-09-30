/**
 * How much a {@link DeviceAntennaProfile} should be trusted by the UI.
 *
 * Ordered from strongest to weakest. The UI must never render a solid, confident-looking
 * marker for `GENERIC` or `UNKNOWN`.
 */
export const Confidence = {
  /** Reported by the OS for this exact unit (Android 14+), or a vendor-verified catalog entry. */
  EXACT: 'EXACT',
  /** Matched against an unverified curated catalog entry (remote or bundled seed). */
  APPROXIMATE: 'APPROXIMATE',
  /** No device-specific match; derived from form factor heuristics only. */
  GENERIC: 'GENERIC',
  /** No signal could be resolved at all. */
  UNKNOWN: 'UNKNOWN',
} as const;
export type Confidence = (typeof Confidence)[keyof typeof Confidence];

/** Which layer of the resolver chain produced a {@link DeviceAntennaProfile}. */
export const DataSource = {
  ANDROID14_API: 'ANDROID14_API',
  REMOTE_CATALOG: 'REMOTE_CATALOG',
  SEED_CATALOG: 'SEED_CATALOG',
  HEURISTIC: 'HEURISTIC',
} as const;
export type DataSource = (typeof DataSource)[keyof typeof DataSource];

/** Physical shape category used to pick a silhouette template and a generic antenna zone. */
export const FormFactor = {
  BAR: 'BAR',
  FOLD_BOOK: 'FOLD_BOOK',
  FOLD_FLIP: 'FOLD_FLIP',
  TABLET: 'TABLET',
} as const;
export type FormFactor = (typeof FormFactor)[keyof typeof FormFactor];

/**
 * Open/closed state of a foldable. A foldable's antenna position commonly differs between
 * states, so this is a first-class input to resolution.
 */
export const FoldState = {
  /** Not a foldable, or fold state unknown. */
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  FOLDED: 'FOLDED',
  UNFOLDED: 'UNFOLDED',
} as const;
export type FoldState = (typeof FoldState)[keyof typeof FoldState];

/** Coarse screen size bucket. Part of the catalog wire format; not used by the heuristic yet. */
export const ScreenSizeClass = {
  COMPACT: 'COMPACT',
  MEDIUM: 'MEDIUM',
  EXPANDED: 'EXPANDED',
} as const;
export type ScreenSizeClass = (typeof ScreenSizeClass)[keyof typeof ScreenSizeClass];

export const ALL_FORM_FACTORS: readonly FormFactor[] = Object.values(FormFactor);
export const ALL_FOLD_STATES: readonly FoldState[] = Object.values(FoldState);
export const ALL_CONFIDENCES: readonly Confidence[] = Object.values(Confidence);
export const ALL_DATA_SOURCES: readonly DataSource[] = Object.values(DataSource);

export function isFormFactor(value: unknown): value is FormFactor {
  return typeof value === 'string' && (ALL_FORM_FACTORS as readonly string[]).includes(value);
}
export function isConfidence(value: unknown): value is Confidence {
  return typeof value === 'string' && (ALL_CONFIDENCES as readonly string[]).includes(value);
}
export function isDataSource(value: unknown): value is DataSource {
  return typeof value === 'string' && (ALL_DATA_SOURCES as readonly string[]).includes(value);
}
