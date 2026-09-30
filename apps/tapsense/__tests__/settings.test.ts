import { DEFAULT_SETTINGS, SettingsStore, hasManualPhoneOverride, reviveSettings } from '../src/data/settings';

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: async (k: string) => data[k] ?? null,
    setItem: async (k: string, v: string) => { data[k] = v; },
  };
}

describe('SettingsStore', () => {
  it('defaults on first launch: onboarding pending, auto-detect, haptics on', async () => {
    const s = await new SettingsStore(memoryStorage()).load();
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(hasManualPhoneOverride(s)).toBe(false);
  });

  it('persists across a restart (new store, same storage)', async () => {
    const storage = memoryStorage();
    const a = new SettingsStore(storage);
    await a.setOnboardingCompleted(true);
    await a.setSelectedPhone('samsung', 'sm-f946b', 'FOLD_BOOK');
    await a.setAppearanceMode('DARK');
    await a.setReduceMotion(true);
    await a.setHapticsEnabled(false);
    const b = await new SettingsStore(storage).load();
    expect(b).toMatchObject({ onboardingCompleted: true, selectedPhoneManufacturer: 'samsung', selectedPhoneModel: 'sm-f946b', selectedPhoneFormFactor: 'FOLD_BOOK', appearanceMode: 'DARK', reduceMotion: true, hapticsEnabled: false });
    expect(hasManualPhoneOverride(b)).toBe(true);
  });

  it('clearSelectedPhone reverts to auto-detect', async () => {
    const s = new SettingsStore(memoryStorage());
    await s.setSelectedPhone('google', 'pixel 8', 'BAR');
    await s.clearSelectedPhone();
    expect(hasManualPhoneOverride(s.snapshot)).toBe(false);
    expect(s.snapshot.selectedPhoneFormFactor).toBeNull();
  });

  it('a corrupt or hostile blob falls back to defaults field by field, never throws', async () => {
    expect(await new SettingsStore(memoryStorage({ 'tapsense.settings.v1': '{oops' })).load()).toEqual(DEFAULT_SETTINGS);
    const revived = reviveSettings({ onboardingCompleted: 'yes', appearanceMode: 'NEON', selectedPhoneFormFactor: 'SPHERE', tapTestSuccessCount: -4, selectedPhoneModel: '' });
    expect(revived).toEqual(DEFAULT_SETTINGS);
  });

  it('a storage failure on write does not crash and the in-memory value stays authoritative', async () => {
    const s = new SettingsStore({ getItem: async () => null, setItem: async () => { throw new Error('disk full'); } });
    await s.setHapticsEnabled(false);
    expect(s.snapshot.hapticsEnabled).toBe(false);
  });

  it('load() after a change returns the current settings, not the first-load snapshot', async () => {
    const s = new SettingsStore(memoryStorage());
    await s.load();
    await s.setSelectedPhone('google', 'pixel 7', 'BAR');
    // A screen mounting later calls load() and must see the pick, not the initial defaults.
    expect((await s.load()).selectedPhoneModel).toBe('pixel 7');
  });

  it('notifies subscribers on change', async () => {
    const s = new SettingsStore(memoryStorage());
    const seen: boolean[] = [];
    s.subscribe((v) => seen.push(v.reduceMotion));
    await s.setReduceMotion(true);
    expect(seen).toEqual([true]);
  });
});

describe('review eligibility (once per install, after the 2nd success)', () => {
  it('first success: not eligible; second: eligible; every later one: never again', async () => {
    const s = new SettingsStore(memoryStorage());
    expect(await s.recordTapTestSuccessAndCheckReviewEligibility()).toBe(false);
    expect(await s.recordTapTestSuccessAndCheckReviewEligibility()).toBe(true);
    expect(await s.recordTapTestSuccessAndCheckReviewEligibility()).toBe(false);
    expect(await s.recordTapTestSuccessAndCheckReviewEligibility()).toBe(false);
    expect(s.snapshot.tapTestSuccessCount).toBe(4); // a true lifetime count, not capped
    expect(s.snapshot.reviewFlowRequested).toBe(true);
  });

  it('concurrent successes cannot both be reported eligible (serialized read-modify-write)', async () => {
    const s = new SettingsStore(memoryStorage());
    const results = await Promise.all([1, 2, 3, 4].map(() => s.recordTapTestSuccessAndCheckReviewEligibility()));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('the latch survives a restart', async () => {
    const storage = memoryStorage();
    const a = new SettingsStore(storage);
    await a.recordTapTestSuccessAndCheckReviewEligibility();
    await a.recordTapTestSuccessAndCheckReviewEligibility();
    expect(await new SettingsStore(storage).recordTapTestSuccessAndCheckReviewEligibility()).toBe(false);
  });
});
