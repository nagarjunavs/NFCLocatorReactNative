import { ALL_FOLD_STATES, ALL_FORM_FACTORS, GenericFallbackSource, deviceFingerprint, rectEquals } from '../src';
import { makeSignals } from './testDoubles';

const source = new GenericFallbackSource();
const unknownFp = deviceFingerprint('unknown', 'unknown', 'unknown', 'unknown', 'unknown', null);
const signals = (formFactor: any, foldState: any) =>
  makeSignals({ fingerprint: unknownFp, formFactor, foldState, isAndroid14ApiAvailable: false });

describe('GenericFallbackSource', () => {
  it('always returns a GENERIC/HEURISTIC profile, never null, for every form factor', async () => {
    for (const ff of ALL_FORM_FACTORS) {
      const r = await source.resolve(signals(ff, 'NOT_APPLICABLE'));
      expect(r).not.toBeNull();
      expect(r.confidence).toBe('GENERIC');
      expect(r.source).toBe('HEURISTIC');
    }
  });

  it('foldable open vs closed resolves to a different zone and template for FOLD_BOOK', async () => {
    const folded = await source.resolve(signals('FOLD_BOOK', 'FOLDED'));
    const unfolded = await source.resolve(signals('FOLD_BOOK', 'UNFOLDED'));
    expect(rectEquals(folded.antennaZone, unfolded.antennaZone)).toBe(false);
    expect(folded.silhouetteTemplateId).not.toBe(unfolded.silhouetteTemplateId);
  });

  it('foldable open vs closed resolves to a different zone for FOLD_FLIP', async () => {
    const folded = await source.resolve(signals('FOLD_FLIP', 'FOLDED'));
    const unfolded = await source.resolve(signals('FOLD_FLIP', 'UNFOLDED'));
    expect(rectEquals(folded.antennaZone, unfolded.antennaZone)).toBe(false);
  });

  it('bar phone zone is unaffected by fold state', async () => {
    const a = await source.resolve(signals('BAR', 'NOT_APPLICABLE'));
    const b = await source.resolve(signals('BAR', 'FOLDED'));
    expect(rectEquals(a.antennaZone, b.antennaZone)).toBe(true);
  });

  it('never produces a rect that exceeds the 0..1 bounds', async () => {
    for (const ff of ALL_FORM_FACTORS) {
      for (const fs of ALL_FOLD_STATES) {
        const z = (await source.resolve(signals(ff, fs))).antennaZone;
        expect(z.x + z.width).toBeLessThanOrEqual(1 + 1e-9);
        expect(z.y + z.height).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});
