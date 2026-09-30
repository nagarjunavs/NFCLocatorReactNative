import { fallbackGuidance, isGuidedSweep, normalizedRect, resolvedMarker, showsConfidentMarker, toUiState } from '../src';
import { makeProfile } from './testDoubles';

const NOW = Date.UTC(2026, 8, 28);
const DAY = 86_400_000;
const sourceFor = { EXACT: 'ANDROID14_API', APPROXIMATE: 'REMOTE_CATALOG', GENERIC: 'HEURISTIC', UNKNOWN: 'HEURISTIC' } as const;
const p = (confidence: keyof typeof sourceFor, lastVerifiedAtEpochMs: number | null = null) =>
  makeProfile({ confidence, source: sourceFor[confidence], lastVerifiedAtEpochMs });

describe('toUiState', () => {
  it('EXACT maps to a non-stale ResolvedMarker (never stale)', () => {
    const s = toUiState(p('EXACT'), NOW);
    expect(s.kind).toBe('resolvedMarker');
    expect((s as any).isStale).toBe(false);
    expect(showsConfidentMarker(s)).toBe(true);
    expect(toUiState(p('EXACT', NOW - 5000 * DAY), NOW)).toMatchObject({ isStale: false });
  });
  it('APPROXIMATE verified recently is not stale', () => {
    expect(toUiState(p('APPROXIMATE', NOW - 10 * DAY), NOW)).toMatchObject({ kind: 'resolvedMarker', isStale: false });
  });
  it('APPROXIMATE verified over 180 days ago is stale, exactly at the boundary handled', () => {
    expect(toUiState(p('APPROXIMATE', NOW - 200 * DAY), NOW)).toMatchObject({ isStale: true });
    expect(toUiState(p('APPROXIMATE', NOW - 180 * DAY), NOW)).toMatchObject({ isStale: false });
    expect(toUiState(p('APPROXIMATE', NOW - 181 * DAY), NOW)).toMatchObject({ isStale: true });
  });
  it('APPROXIMATE with no verification timestamp is treated as stale', () => {
    const s = toUiState(p('APPROXIMATE', null), NOW);
    expect(s).toMatchObject({ isStale: true });
    expect(showsConfidentMarker(s)).toBe(false);
    expect(isGuidedSweep(s)).toBe(true);
  });
  it('GENERIC and UNKNOWN always map to FallbackGuidance, never a marker', () => {
    for (const c of ['GENERIC', 'UNKNOWN'] as const) {
      const s = toUiState(p(c), NOW);
      expect(s.kind).toBe('fallbackGuidance');
      expect(showsConfidentMarker(s)).toBe(false);
      expect(isGuidedSweep(s)).toBe(true);
    }
  });
  it('picks a form-factor tip for GENERIC and the general tip for UNKNOWN', () => {
    expect(toUiState(makeProfile({ confidence: 'GENERIC', formFactor: 'TABLET' }), NOW)).toMatchObject({ tipTextKey: 'nfc_locator_sweep_tablet_tip' });
    expect(toUiState(makeProfile({ confidence: 'GENERIC', formFactor: 'FOLD_FLIP' }), NOW)).toMatchObject({ tipTextKey: 'nfc_locator_sweep_fold_flip_tip' });
    expect(toUiState(makeProfile({ confidence: 'UNKNOWN' }), NOW)).toMatchObject({ tipTextKey: 'nfc_locator_sweep_unknown_tip' });
  });
  it('carries the real aspect ratio through', () => {
    expect(toUiState(makeProfile({ confidence: 'EXACT', aspectRatio: 0.47 }), NOW)).toMatchObject({ aspectRatio: 0.47 });
  });
});

describe('UI state invariants', () => {
  const zone = normalizedRect(0.3, 0.2, 0.4, 0.14);
  it('ResolvedMarker cannot be constructed for GENERIC or UNKNOWN', () => {
    for (const confidence of ['GENERIC', 'UNKNOWN']) {
      expect(() => resolvedMarker({ formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar', antennaZone: zone, confidence: confidence as any, source: 'HEURISTIC', isStale: false })).toThrow();
    }
  });
  it('FallbackGuidance cannot be constructed for EXACT or APPROXIMATE', () => {
    for (const confidence of ['EXACT', 'APPROXIMATE']) {
      expect(() => fallbackGuidance({ formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar', approximateZone: zone, confidence: confidence as any, tipTextKey: 'nfc_locator_sweep_generic_tip' })).toThrow();
    }
  });
});
