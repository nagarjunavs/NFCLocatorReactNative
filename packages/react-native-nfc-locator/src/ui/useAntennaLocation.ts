import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeviceIdentitySignals } from '../domain/model/DeviceAntennaProfile';
import type { NfcLocator } from '../createNfcLocator';
import { type AntennaLocatorUiState, ErrorState, LoadingState, toUiState } from './state';

/**
 * Resolves `signals` through the locator and exposes the UI state plus a `retry`. Failures
 * (a source misbehaving in a way the chain didn't absorb) degrade to the Error state, never
 * a crash. Pass `null` while signals are still loading. `signals` must be referentially stable
 * across renders (hold it in state); a new object each render re-runs the resolution.
 */
export function useAntennaLocation(
  locator: NfcLocator,
  signals: DeviceIdentitySignals | null,
): { state: AntennaLocatorUiState; retry: () => void } {
  const [state, setState] = useState<AntennaLocatorUiState>(LoadingState);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    if (!signals) {
      setState(LoadingState);
      return;
    }
    const mine = ++generation.current;
    setState(LoadingState);
    locator
      .resolve(signals)
      .then((profile) => mine === generation.current && setState(toUiState(profile)))
      .catch(() => mine === generation.current && setState(ErrorState));
  }, [locator, signals, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
