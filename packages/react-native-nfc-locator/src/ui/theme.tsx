import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { Confidence } from '../domain/model/enums';

/**
 * Colors the library draws with. The library never hardcodes brand hues: hosts pass a
 * `theme` (typically derived from their own design system); these neutral defaults follow the
 * system light/dark appearance.
 */
export interface NfcLocatorTheme {
  /** Solid marker for EXACT/APPROXIMATE (confident). */
  markerConfident: string;
  /** Dashed ring + sweep highlight for low-confidence states. */
  markerLowConfidence: string;
  silhouette: string;
  silhouetteBorder: string;
  background: string;
  text: string;
  textSecondary: string;
  badge: Record<Confidence, { background: string; text: string }>;
  errorContainer: string;
  onErrorContainer: string;
  button: string;
  onButton: string;
}

export const lightTheme: NfcLocatorTheme = {
  markerConfident: '#0B6BCB',
  markerLowConfidence: '#B26A00',
  silhouette: '#C9CED6',
  silhouetteBorder: '#9AA3AF',
  background: '#FFFFFF',
  text: '#111827',
  textSecondary: '#4B5563',
  badge: {
    EXACT: { background: '#D6E8FB', text: '#062E57' },
    APPROXIMATE: { background: '#E4E7EC', text: '#1F2937' },
    GENERIC: { background: '#FCE8C8', text: '#5A3400' },
    UNKNOWN: { background: '#ECEEF1', text: '#374151' },
  },
  errorContainer: '#FDE4E1',
  onErrorContainer: '#601410',
  button: '#0B6BCB',
  onButton: '#FFFFFF',
};

export const darkTheme: NfcLocatorTheme = {
  markerConfident: '#6DB3F8',
  markerLowConfidence: '#F0B454',
  silhouette: '#3A404A',
  silhouetteBorder: '#5B6472',
  background: '#0F1216',
  text: '#F3F4F6',
  textSecondary: '#B6BCC6',
  badge: {
    EXACT: { background: '#123A63', text: '#D6E8FB' },
    APPROXIMATE: { background: '#2B313B', text: '#E4E7EC' },
    GENERIC: { background: '#5A3400', text: '#FCE8C8' },
    UNKNOWN: { background: '#262B33', text: '#D1D5DB' },
  },
  errorContainer: '#5C1E1A',
  onErrorContainer: '#FDE4E1',
  button: '#6DB3F8',
  onButton: '#0B2440',
};

export type NfcLocatorThemeInput = Partial<Omit<NfcLocatorTheme, 'badge'>> & {
  badge?: Partial<NfcLocatorTheme['badge']>;
};

const ThemeContext = createContext<NfcLocatorThemeInput | null>(null);

export function NfcLocatorThemeProvider({ theme, children }: { theme: NfcLocatorThemeInput; children: React.ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Merges the host theme over the system-appropriate defaults. */
export function mergeTheme(base: NfcLocatorTheme, override: NfcLocatorThemeInput | null | undefined): NfcLocatorTheme {
  if (!override) return base;
  return { ...base, ...override, badge: { ...base.badge, ...override.badge } } as NfcLocatorTheme;
}

export function useNfcLocatorTheme(explicit?: NfcLocatorThemeInput): NfcLocatorTheme {
  const scheme = useColorScheme();
  const ctx = useContext(ThemeContext);
  return useMemo(
    () => mergeTheme(mergeTheme(scheme === 'dark' ? darkTheme : lightTheme, ctx), explicit),
    [scheme, ctx, explicit],
  );
}
