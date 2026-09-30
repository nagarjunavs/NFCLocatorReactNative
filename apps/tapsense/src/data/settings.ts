import type { FormFactor, KeyValueStorage } from 'react-native-nfc-locator';
import { isFormFactor } from 'react-native-nfc-locator';

export type AppearanceMode = 'SYSTEM' | 'LIGHT' | 'DARK';

/**
 * Everything persisted across launches. A null phone override means "auto-detect the phone
 * this app is actually running on" (the primary behavior); a non-null triple means the user
 * explicitly picked one on the phone-selection screen. The form factor is persisted alongside
 * the pick so resolution doesn't depend on that catalog entry still existing unchanged later.
 */
export interface TapSenseSettings {
  onboardingCompleted: boolean;
  selectedPhoneManufacturer: string | null;
  selectedPhoneModel: string | null;
  selectedPhoneFormFactor: FormFactor | null;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  appearanceMode: AppearanceMode;
  tapTestSuccessCount: number;
  reviewFlowRequested: boolean;
}

export const DEFAULT_SETTINGS: TapSenseSettings = Object.freeze({
  onboardingCompleted: false,
  selectedPhoneManufacturer: null,
  selectedPhoneModel: null,
  selectedPhoneFormFactor: null,
  hapticsEnabled: true,
  reduceMotion: false,
  appearanceMode: 'SYSTEM',
  tapTestSuccessCount: 0,
  reviewFlowRequested: false,
});

export const hasManualPhoneOverride = (s: TapSenseSettings): boolean =>
  s.selectedPhoneManufacturer != null && s.selectedPhoneModel != null;

/** Ask for a review after the *second* successful tap test, a real signal the user got value. */
export const REVIEW_TRIGGER_TAP_TEST_SUCCESS_COUNT = 2;

const STORAGE_KEY = 'tapsense.settings.v1';
const APPEARANCE: readonly string[] = ['SYSTEM', 'LIGHT', 'DARK'];

/** Validates untrusted persisted JSON field by field; anything unusable falls back to its default. */
export function reviveSettings(raw: unknown): TapSenseSettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    onboardingCompleted: bool(o.onboardingCompleted, false),
    selectedPhoneManufacturer: str(o.selectedPhoneManufacturer),
    selectedPhoneModel: str(o.selectedPhoneModel),
    selectedPhoneFormFactor: isFormFactor(o.selectedPhoneFormFactor) ? o.selectedPhoneFormFactor : null,
    hapticsEnabled: bool(o.hapticsEnabled, true),
    reduceMotion: bool(o.reduceMotion, false),
    appearanceMode: APPEARANCE.includes(o.appearanceMode as string) ? (o.appearanceMode as AppearanceMode) : 'SYSTEM',
    tapTestSuccessCount: typeof o.tapTestSuccessCount === 'number' && o.tapTestSuccessCount >= 0 ? Math.floor(o.tapTestSuccessCount) : 0,
    reviewFlowRequested: bool(o.reviewFlowRequested, false),
  };
}

type Listener = (s: TapSenseSettings) => void;

/**
 * Real (persisted, not in-memory) storage for every user-controllable setting. Writes are
 * serialized so a read-modify-write like {@link recordTapTestSuccessAndCheckReviewEligibility}
 * is atomic with respect to other updates.
 */
export class SettingsStore {
  private current: TapSenseSettings = DEFAULT_SETTINGS;
  private loaded: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage: KeyValueStorage) {}

  /**
   * Loads from storage once, then always resolves with the current settings, so a screen that
   * mounts after a change never sees a stale snapshot. Never rejects.
   */
  async load(): Promise<TapSenseSettings> {
    this.loaded ??= (async () => {
      try {
        const raw = await this.storage.getItem(STORAGE_KEY);
        this.current = raw ? reviveSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
      } catch {
        this.current = DEFAULT_SETTINGS;
      }
    })();
    await this.loaded;
    return this.current;
  }

  get snapshot(): TapSenseSettings {
    return this.current;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Serialized read-modify-write. */
  private update<R>(fn: (s: TapSenseSettings) => { next: TapSenseSettings; result: R }): Promise<R> {
    const run = async (): Promise<R> => {
      await this.load();
      const { next, result } = fn(this.current);
      this.current = next;
      this.listeners.forEach((l) => l(next));
      try {
        await this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // A failed write must not crash the app; the in-memory value stays authoritative.
      }
      return result;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private patch(p: Partial<TapSenseSettings>): Promise<void> {
    return this.update((s) => ({ next: { ...s, ...p }, result: undefined }));
  }

  setOnboardingCompleted = (v: boolean) => this.patch({ onboardingCompleted: v });
  setHapticsEnabled = (v: boolean) => this.patch({ hapticsEnabled: v });
  setReduceMotion = (v: boolean) => this.patch({ reduceMotion: v });
  setAppearanceMode = (v: AppearanceMode) => this.patch({ appearanceMode: v });

  setSelectedPhone = (manufacturer: string, model: string, formFactor: FormFactor) =>
    this.patch({ selectedPhoneManufacturer: manufacturer, selectedPhoneModel: model, selectedPhoneFormFactor: formFactor });

  /** Reverts to auto-detecting the running device. */
  clearSelectedPhone = () =>
    this.patch({ selectedPhoneManufacturer: null, selectedPhoneModel: null, selectedPhoneFormFactor: null });

  /**
   * Records one more successful tap test and reports whether *this* success is the moment to
   * request an in-app review: the count just reached the trigger and it was never requested
   * before on this install. The count keeps incrementing (a true lifetime count) but the
   * requested flag latches the moment eligibility is reported, so the review is only ever
   * requested once per install. Increment and latch happen in one serialized update.
   */
  recordTapTestSuccessAndCheckReviewEligibility(reviewTriggerCount: number = REVIEW_TRIGGER_TAP_TEST_SUCCESS_COUNT): Promise<boolean> {
    return this.update((s) => {
      const count = s.tapTestSuccessCount + 1;
      const eligible = !s.reviewFlowRequested && count >= reviewTriggerCount;
      return { next: { ...s, tapTestSuccessCount: count, reviewFlowRequested: s.reviewFlowRequested || eligible }, result: eligible };
    });
  }
}
