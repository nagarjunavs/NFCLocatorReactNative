import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppEnvironment } from '../AppEnvironment';
import { DEFAULT_SETTINGS, type TapSenseSettings } from '../data/settings';

const EnvContext = createContext<AppEnvironment | null>(null);

export function EnvironmentProvider({ env, children }: { env: AppEnvironment; children: React.ReactNode }) {
  return <EnvContext.Provider value={env}>{children}</EnvContext.Provider>;
}

export function useEnv(): AppEnvironment {
  const env = useContext(EnvContext);
  if (!env) throw new Error('useEnv must be used inside <EnvironmentProvider>');
  return env;
}

/** Live settings from the persisted store; `ready` flips once the first load finished. */
export function useSettings(): { settings: TapSenseSettings; ready: boolean; store: AppEnvironment['settings'] } {
  const { settings: store } = useEnv();
  const [value, setValue] = useState<TapSenseSettings>(store.snapshot);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const unsub = store.subscribe((s) => alive && setValue(s));
    store.load().then((s) => {
      if (!alive) return;
      setValue(s);
      setReady(true);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [store]);
  return { settings: ready ? value : DEFAULT_SETTINGS, ready, store };
}
