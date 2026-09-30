import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import {
  AntennaLocatorScreen,
  AntennaSilhouette,
  ConfidenceBadge,
  GuidedSweepAnimation,
  NfcLocatorLocaleProvider,
  RetryGuidanceBanner,
  ErrorState,
  LoadingState,
  normalizedRect,
  toUiState,
  fallbackGuidance,
  resolvedMarker,
  type AntennaLocatorUiState,
} from '../src';
import { makeProfile } from './testDoubles';

const NOW = Date.UTC(2026, 8, 28);
const zone = normalizedRect(0.3, 0.2, 0.4, 0.14);

/** Lays the component out at a known size so the SVG (which needs onLayout) renders. */
async function layout(node: React.ReactElement) {
  const utils = await render(node);
  for (const el of screen.queryAllByTestId('nfc-silhouette')) {
    await fireEvent(el, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 340 } } });
  }
  return utils;
}

const profileFor = (confidence: 'EXACT' | 'APPROXIMATE' | 'GENERIC' | 'UNKNOWN', extra = {}) =>
  makeProfile({
    confidence,
    source: confidence === 'EXACT' ? 'ANDROID14_API' : confidence === 'APPROXIMATE' ? 'SEED_CATALOG' : 'HEURISTIC',
    lastVerifiedAtEpochMs: NOW - 10 * 86_400_000,
    ...extra,
  });

const ui = (p: ReturnType<typeof profileFor>) => toUiState(p, NOW);

describe('AntennaLocatorScreen: confidence-aware rendering', () => {
  it('EXACT (on-device): badge, solid marker, exact hint, no sweep', async () => {
    await layout(<AntennaLocatorScreen state={ui(profileFor('EXACT'))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.getByText('Exact location')).toBeTruthy();
    expect(screen.queryByTestId('nfc-marker-solid-dot')).not.toBeNull();
    expect(screen.queryByTestId('nfc-marker-dashed-ring')).toBeNull();
    expect(screen.queryByTestId('nfc-guided-sweep')).toBeNull();
    expect(screen.getByText('Hold this spot against the reader.')).toBeTruthy();
  });

  it('EXACT from a verified catalog entry uses the "verified for this model" copy', async () => {
    await layout(<AntennaLocatorScreen state={ui(profileFor('EXACT', { source: 'SEED_CATALOG' }))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.getByText(/Verified tap zone for this exact model/)).toBeTruthy();
    expect(screen.queryByTestId('nfc-marker-solid-dot')).not.toBeNull();
  });

  it('APPROXIMATE (fresh): approximate badge + hint, still a solid marker, no sweep', async () => {
    await layout(<AntennaLocatorScreen state={ui(profileFor('APPROXIMATE'))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.getByText('Approximate location')).toBeTruthy();
    expect(screen.getByText(/Hold roughly this spot/)).toBeTruthy();
    expect(screen.queryByTestId('nfc-marker-solid-dot')).not.toBeNull();
    expect(screen.queryByTestId('nfc-guided-sweep')).toBeNull();
  });

  it('APPROXIMATE (stale): NO solid marker anywhere, stale hint, sweep shown', async () => {
    await layout(<AntennaLocatorScreen state={ui(profileFor('APPROXIMATE', { lastVerifiedAtEpochMs: NOW - 400 * 86_400_000 }))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.getByText(/hasn.t been verified recently/)).toBeTruthy();
    expect(screen.queryByTestId('nfc-marker-solid-dot')).toBeNull();
    // Both the stale marker itself and the sweep below it are dashed (two silhouettes).
    expect(screen.queryAllByTestId('nfc-marker-dashed-ring').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('nfc-guided-sweep')).not.toBeNull();
  });

  it('APPROXIMATE with no verification timestamp is treated as stale (no solid marker)', async () => {
    await layout(<AntennaLocatorScreen state={ui(profileFor('APPROXIMATE', { lastVerifiedAtEpochMs: null }))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.queryByTestId('nfc-marker-solid-dot')).toBeNull();
  });

  it.each([['GENERIC', 'Estimated area'], ['UNKNOWN', 'Unknown device']] as const)('%s: badge, guided sweep, dashed ring, NEVER a solid marker', async (confidence, label) => {
    await layout(<AntennaLocatorScreen state={ui(profileFor(confidence))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByTestId('nfc-marker-solid-dot')).toBeNull();
    expect(screen.queryByTestId('nfc-marker-solid-ring')).toBeNull();
    expect(screen.queryByTestId('nfc-marker-dashed-ring')).not.toBeNull();
    expect(screen.queryByTestId('nfc-guided-sweep')).not.toBeNull();
  });

  it('shows a form-factor tip for GENERIC and the general tip for UNKNOWN', async () => {
    await layout(<AntennaLocatorScreen state={ui(profileFor('GENERIC', { formFactor: 'TABLET' }))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.getByText('Try the center-back of your tablet.')).toBeTruthy();
    await screen.unmount();
    await layout(<AntennaLocatorScreen state={ui(profileFor('UNKNOWN'))} onRetry={jest.fn()} reducedMotion />);
    expect(screen.getByText(/Most Android phones have their NFC antenna near the upper back/)).toBeTruthy();
  });

  it('loading state shows a described progress indicator and no marker', async () => {
    await render(<AntennaLocatorScreen state={LoadingState} onRetry={jest.fn()} />);
    expect(screen.getByLabelText(/Looking up your device/)).toBeTruthy();
    expect(screen.queryByTestId('nfc-silhouette')).toBeNull();
  });

  it('error state shows copy and a working retry button', async () => {
    const onRetry = jest.fn();
    await render(<AntennaLocatorScreen state={ErrorState} onRetry={onRetry} />);
    expect(screen.getByText(/Couldn.t determine antenna location/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('localizes through the locale prop and provider (no hardcoded text)', async () => {
    await render(<AntennaLocatorScreen state={ErrorState} onRetry={jest.fn()} locale="de" />);
    expect(screen.queryByText('Try again')).toBeNull();
    await screen.unmount();
    await render(<NfcLocatorLocaleProvider locale="ja"><AntennaLocatorScreen state={ErrorState} onRetry={jest.fn()} /></NfcLocatorLocaleProvider>);
    expect(screen.queryByText('Try again')).toBeNull();
  });
});

describe('invariant: a solid marker is only ever drawn for confident states', () => {
  it('AntennaSilhouette with isConfident=false never draws the solid dot/ring', async () => {
    await layout(<AntennaSilhouette templateId="silhouette_bar" zone={zone} isConfident={false} reducedMotion />);
    expect(screen.queryByTestId('nfc-marker-solid-dot')).toBeNull();
    expect(screen.queryByTestId('nfc-marker-solid-ring')).toBeNull();
  });

  it('exhaustive over every confidence x stale combination', async () => {
    const cases: Array<[AntennaLocatorUiState, boolean]> = [
      [ui(profileFor('EXACT')), true],
      [ui(profileFor('APPROXIMATE')), true],
      [ui(profileFor('APPROXIMATE', { lastVerifiedAtEpochMs: null })), false],
      [ui(profileFor('GENERIC')), false],
      [ui(profileFor('UNKNOWN')), false],
    ];
    for (const [state, expectSolid] of cases) {
      const view = await layout(<AntennaLocatorScreen state={state} onRetry={jest.fn()} reducedMotion />);
      expect(screen.queryByTestId('nfc-marker-solid-dot') !== null).toBe(expectSolid);
      await view.unmount();
    }
  });

  it('cannot even construct an illegal state', async () => {
    expect(() => resolvedMarker({ formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar', antennaZone: zone, confidence: 'GENERIC' as never, source: 'HEURISTIC', isStale: false })).toThrow();
    expect(() => fallbackGuidance({ formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar', approximateZone: zone, confidence: 'EXACT' as never, tipTextKey: 'nfc_locator_sweep_generic_tip' })).toThrow();
  });
});

describe('accessibility', () => {
  it('a confident marker announces itself to screen readers', async () => {
    await layout(<AntennaSilhouette templateId="silhouette_bar" zone={zone} isConfident reducedMotion />);
    expect(screen.getByLabelText('NFC antenna location marker')).toBeTruthy();
  });

  it('the sweep is described once, and the silhouette inside it stays silent (no double announcement)', async () => {
    await layout(<GuidedSweepAnimation templateId="silhouette_bar" zone={zone} reducedMotion />);
    expect(screen.getAllByLabelText(/Guided sweep animation/)).toHaveLength(1);
    expect(screen.queryByLabelText('NFC antenna location marker')).toBeNull();
  });

  it('a low-confidence silhouette on its own is silent (its wrapper owns the description)', async () => {
    await layout(<AntennaSilhouette templateId="silhouette_bar" zone={zone} isConfident={false} reducedMotion />);
    expect(screen.queryByLabelText('NFC antenna location marker')).toBeNull();
  });

  it('the badge exposes its label and the retry banner is a polite live region', async () => {
    await render(<><ConfidenceBadge confidence="GENERIC" /><RetryGuidanceBanner /></>);
    expect(screen.getByLabelText('Estimated area')).toBeTruthy();
    expect(screen.getByTestId('nfc-retry-banner').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Reposition and try again')).toBeTruthy();
  });

  it('the retry button meets the 48dp minimum touch target', async () => {
    await render(<AntennaLocatorScreen state={ErrorState} onRetry={jest.fn()} />);
    const style = screen.getByTestId('nfc-retry-button').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
    expect(flat.minHeight).toBeGreaterThanOrEqual(48);
    expect(flat.minWidth).toBeGreaterThanOrEqual(48);
  });
});

describe('motion', () => {
  it('reduced motion renders a static glow instead of the animated ripple', async () => {
    await layout(<AntennaSilhouette templateId="silhouette_bar" zone={zone} isConfident reducedMotion />);
    expect(screen.queryByTestId('nfc-marker-glow-static')).not.toBeNull();
    expect(screen.queryByTestId('nfc-marker-ripple')).toBeNull();
  });

  it('without reduced motion the ripple animates', async () => {
    jest.useFakeTimers();
    await layout(<AntennaSilhouette templateId="silhouette_bar" zone={zone} isConfident />);
    expect(screen.queryByTestId('nfc-marker-ripple')).not.toBeNull();
    expect(screen.queryByTestId('nfc-marker-glow-static')).toBeNull();
    await act(async () => { jest.advanceTimersByTime(1000); });
    jest.useRealTimers();
  });

  it('reduced motion also freezes the sweep highlight', async () => {
    await layout(<GuidedSweepAnimation templateId="silhouette_bar" zone={zone} reducedMotion />);
    expect(screen.queryByTestId('nfc-guided-sweep')).not.toBeNull();
  });
});

describe('layout', () => {
  it('a caller-supplied fixed width is not overridden by the default stretch (marker stays centerable)', async () => {
    await layout(<AntennaSilhouette templateId="silhouette_bar" zone={zone} isConfident reducedMotion style={{ width: 120, height: 230 }} />);
    const flat = Object.assign({}, ...[screen.getByTestId('nfc-silhouette').props.style].flat(Infinity));
    expect(flat.width).toBe(120);
    expect(flat.alignSelf).toBeUndefined();
  });
  it('with no size given it still fills the parent', async () => {
    await layout(<AntennaSilhouette templateId="silhouette_bar" zone={zone} isConfident reducedMotion />);
    const flat = Object.assign({}, ...[screen.getByTestId('nfc-silhouette').props.style].flat(Infinity));
    expect(flat.alignSelf).toBe('stretch');
    expect(flat.flex).toBe(1);
  });
});
