import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import { SUPPORTED_LOCALES, resolveLocale, formatString, type Locale } from 'react-native-nfc-locator';
import { APP_STRINGS, type AppStringKey } from './generated';

export type { AppStringKey } from './generated';

/**
 * Strings for the Core NFC "reader couldn't start" state, which the generated table does not
 * contain. English only; other locales fall back to it.
 */
const SUPPLEMENT_EN = {
  tap_test_state_reader_unavailable: "Couldn't start the NFC reader",
  tap_test_hint_reader_unavailable:
    "The reader session didn't start. This can happen if NFC isn't available for this build, or the phone was moved away before it could begin. Try again.",
} as const;

export type StringKey = AppStringKey | keyof typeof SUPPLEMENT_EN;
export type T = (key: StringKey, ...args: Array<string | number>) => string;

/**
 * Device locale as a BCP-47 tag. Read from the platform's own settings first, because Hermes'
 * `Intl` does not reliably reflect the per-app language (iOS Settings > TapSense > Language,
 * Android 13+ per-app picker): iOS `AppleLanguages[0]`, Android's `I18nManager` locale identifier.
 */
export function detectDeviceLocale(): string {
  try {
    if (Platform.OS === 'ios') {
      const langs = NativeModules.SettingsManager?.getConstants?.()?.settings?.AppleLanguages ?? NativeModules.SettingsManager?.settings?.AppleLanguages;
      if (Array.isArray(langs) && typeof langs[0] === 'string') return langs[0];
    } else {
      const id = NativeModules.I18nManager?.getConstants?.()?.localeIdentifier ?? NativeModules.I18nManager?.localeIdentifier;
      if (typeof id === 'string' && id) return id.replace('_', '-');
    }
  } catch {
    // Fall through to Intl.
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

export function createT(locale: string | null | undefined): T {
  const resolved: Locale = resolveLocale(locale);
  const table = APP_STRINGS[resolved] ?? {};
  const en = APP_STRINGS.en ?? {};
  return (key, ...args) => {
    const raw = table[key] ?? en[key] ?? (SUPPLEMENT_EN as Record<string, string>)[key] ?? key;
    return formatString(raw, args);
  };
}

interface I18nValue {
  locale: Locale;
  t: T;
}
const I18nContext = createContext<I18nValue>({ locale: 'en', t: createT('en') });

/** Provides `t` and re-detects the locale when the app returns to the foreground (per-app language changes). */
export function I18nProvider({ children, override }: { children: React.ReactNode; override?: string }) {
  const [tag, setTag] = useState<string>(() => override ?? detectDeviceLocale());
  useEffect(() => {
    if (override) return;
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setTag(detectDeviceLocale()));
    return () => sub.remove();
  }, [override]);
  const value = useMemo<I18nValue>(() => ({ locale: resolveLocale(override ?? tag), t: createT(override ?? tag) }), [tag, override]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = (): I18nValue => useContext(I18nContext);
export const useT = (): T => useContext(I18nContext).t;
export { SUPPORTED_LOCALES };
