import React, { createContext, useContext, useMemo } from 'react';
import { createTranslator, type Translator } from '../i18n';

interface LocaleContextValue {
  locale: string | null | undefined;
}
const LocaleContext = createContext<LocaleContextValue>({ locale: undefined });

/** Optional locale override (BCP-47). Without it, English; hosts pass their app's locale. */
export function NfcLocatorLocaleProvider({ locale, children }: { locale: string | null | undefined; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslator(explicitLocale?: string | null): Translator {
  const ctx = useContext(LocaleContext);
  const locale = explicitLocale ?? ctx.locale;
  return useMemo(() => createTranslator(locale), [locale]);
}
