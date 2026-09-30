import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  ErrorState, LoadingState, toUiState,
  type AntennaLocatorUiState, type DeviceAntennaProfile, type NativeNfcState,
} from 'react-native-nfc-locator';
import { hasManualPhoneOverride } from '../data/settings';
import { useEnv, useSettings } from './context';

export interface ActiveAntenna {
  isLoading: boolean;
  profile: DeviceAntennaProfile | null;
  uiState: AntennaLocatorUiState;
  isManualOverride: boolean;
  reduceMotion: boolean;
  refresh: () => void;
}

/**
 * Resolves the antenna for "the phone the app should show guidance for right now": the real
 * running device by default, a synthetic pick when the user chose another phone. Re-resolves
 * when the pick changes. A failure degrades to a visible Error state (logged), never a crash.
 * `useOverride: false` always auto-detects (onboarding previews the real device).
 */
export function useActiveAntenna({ useOverride = true }: { useOverride?: boolean } = {}): ActiveAntenna {
  const env = useEnv();
  const { settings, ready } = useSettings();
  const [state, setState] = useState<{ isLoading: boolean; profile: DeviceAntennaProfile | null; uiState: AntennaLocatorUiState }>({
    isLoading: true, profile: null, uiState: LoadingState,
  });
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const overrideKey = useOverride ? `${settings.selectedPhoneManufacturer}|${settings.selectedPhoneModel}|${settings.selectedPhoneFormFactor}` : 'auto';

  useEffect(() => {
    if (!ready) return;
    const mine = ++generation.current;
    setState((s) => ({ ...s, isLoading: true }));
    (async () => {
      try {
        const signals = useOverride ? await env.signalsFor(settings) : await env.autoDetectSignals();
        const profile = await env.locator.resolve(signals);
        if (mine === generation.current) setState({ isLoading: false, profile, uiState: toUiState(profile) });
      } catch (e) {
        // ResolveAntennaLocationUseCase already absorbs per-source failures, so this is a defensive
        // last resort (signals provider / settings read): degrade visibly instead of crashing.
        env.logger.e('useActiveAntenna', 'Failed to resolve antenna location', e);
        if (mine === generation.current) setState({ isLoading: false, profile: null, uiState: ErrorState });
      }
    })();
    // `settings` is read through overrideKey on purpose: only the phone pick should re-resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, ready, overrideKey, attempt, useOverride]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, isManualOverride: hasManualPhoneOverride(settings), reduceMotion: settings.reduceMotion, refresh };
}

/**
 * Live NFC availability. Supported/enabled come from the native module, kept fresh by change
 * events AND a re-check on foreground (the broadcast alone can be missed for a backgrounded
 * process on some OEMs). Defaults to "supported" until the first read so screens don't flash
 * an unsupported notice; `ready` says when the answer is real.
 */
export function useNfcState(): NativeNfcState & { ready: boolean } {
  const { native } = useEnv();
  const [nfc, setNfc] = useState<NativeNfcState & { ready: boolean }>({ isSupported: true, isEnabled: false, canOpenSettings: false, ready: false });
  useEffect(() => {
    if (!native) {
      setNfc({ isSupported: false, isEnabled: false, canOpenSettings: false, ready: true });
      return;
    }
    let alive = true;
    const read = () => native.getNfcState().then((s) => alive && setNfc({ ...s, ready: true })).catch(() => alive && setNfc((p) => ({ ...p, ready: true })));
    read();
    const sub = native.onNfcStateChanged((s) => alive && setNfc({ ...s, ready: true }));
    const app = AppState.addEventListener('change', (st) => st === 'active' && read());
    return () => {
      alive = false;
      sub.remove();
      app.remove();
    };
  }, [native]);
  return nfc;
}

/** Time-of-day greeting key (5-11 morning, 12-17 afternoon, else evening). */
export function greetingKey(hour: number): 'home_greeting_morning' | 'home_greeting_afternoon' | 'home_greeting_evening' {
  if (hour >= 5 && hour <= 11) return 'home_greeting_morning';
  if (hour >= 12 && hour <= 17) return 'home_greeting_afternoon';
  return 'home_greeting_evening';
}
