import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { NfcLocatorThemeInput } from 'react-native-nfc-locator';
import type { AppearanceMode } from '../data/settings';
import { Palette } from './palette';

/** Material-3-style color roles. */
export interface Colors {
  background: string; onBackground: string;
  surface: string; onSurface: string;
  surfaceVariant: string; onSurfaceVariant: string;
  outline: string; outlineVariant: string;
  primary: string; onPrimary: string;
  primaryContainer: string; onPrimaryContainer: string;
  secondary: string; onSecondary: string;
  secondaryContainer: string; onSecondaryContainer: string;
  tertiary: string; onTertiary: string;
  tertiaryContainer: string; onTertiaryContainer: string;
  error: string; onError: string;
  errorContainer: string; onErrorContainer: string;
  /** Primary filled button (graphite-on-white / cream-on-black); kept off `primary`, which is the aqua marker accent. */
  inverseSurface: string; inverseOnSurface: string;
}

export const lightColors: Colors = {
  background: Palette.LightBg, onBackground: Palette.Ink,
  surface: Palette.LightSurface, onSurface: Palette.Ink,
  surfaceVariant: Palette.LightSurfaceAlt, onSurfaceVariant: Palette.Ink2,
  outline: Palette.LightOutline, outlineVariant: Palette.LightDivider,
  primary: Palette.Aqua, onPrimary: Palette.AquaLink,
  primaryContainer: Palette.SuccessContainer, onPrimaryContainer: Palette.SuccessOn,
  secondary: Palette.Graphite, onSecondary: Palette.LightSurface,
  secondaryContainer: Palette.ApproxContainer, onSecondaryContainer: Palette.ApproxOn,
  tertiary: Palette.Aqua, onTertiary: Palette.AquaLink,
  tertiaryContainer: Palette.AmberContainer, onTertiaryContainer: Palette.AmberOnStrong,
  error: Palette.Error, onError: Palette.LightSurface,
  errorContainer: Palette.AmberContainer, onErrorContainer: Palette.Error,
  inverseSurface: Palette.Graphite, inverseOnSurface: Palette.LightSurface,
};

export const darkColors: Colors = {
  background: Palette.DarkBg, onBackground: Palette.TextLight,
  surface: Palette.DarkSurface, onSurface: Palette.TextLight,
  surfaceVariant: Palette.DarkSurfaceAlt, onSurfaceVariant: Palette.TextLightSecondary,
  outline: Palette.DarkOutline, outlineVariant: Palette.DarkDivider,
  primary: Palette.AquaDark, onPrimary: Palette.DarkSurfaceDeep,
  primaryContainer: Palette.DarkSurfaceAlt, onPrimaryContainer: Palette.AquaDark,
  secondary: Palette.TextLight, onSecondary: Palette.DarkBg,
  secondaryContainer: Palette.DarkSurfaceAlt, onSecondaryContainer: Palette.AquaDark,
  tertiary: Palette.AquaDark, onTertiary: Palette.DarkSurfaceDeep,
  tertiaryContainer: Palette.AmberContainerDark, onTertiaryContainer: Palette.Amber,
  error: Palette.Error, onError: Palette.TextLight,
  errorContainer: Palette.DarkSurfaceAlt, onErrorContainer: Palette.Error,
  inverseSurface: Palette.TextLight, inverseOnSurface: Palette.DarkSurfaceDeep,
};

/** Manrope for headlines, Inter for UI and body text (static instances cut from the variable fonts). */
export const Fonts = {
  manropeMedium: 'Manrope-Medium',
  manropeSemiBold: 'Manrope-SemiBold',
  manropeBold: 'Manrope-Bold',
  manropeExtraBold: 'Manrope-ExtraBold',
  interRegular: 'Inter-Regular',
  interMedium: 'Inter-Medium',
  interSemiBold: 'Inter-SemiBold',
  interBold: 'Inter-Bold',
} as const;

/** The design's type scale (Type.kt). */
export const type = {
  displayMedium: { fontFamily: Fonts.manropeExtraBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.32 },
  headlineLarge: { fontFamily: Fonts.manropeExtraBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  headlineSmall: { fontFamily: Fonts.manropeExtraBold, fontSize: 22, lineHeight: 28 },
  titleLarge: { fontFamily: Fonts.manropeBold, fontSize: 20, lineHeight: 26 },
  titleMedium: { fontFamily: Fonts.manropeBold, fontSize: 17, lineHeight: 22 },
  titleSmall: { fontFamily: Fonts.interSemiBold, fontSize: 14, lineHeight: 20 },
  bodyLarge: { fontFamily: Fonts.interRegular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: Fonts.interRegular, fontSize: 14, lineHeight: 21 },
  bodySmall: { fontFamily: Fonts.interRegular, fontSize: 13, lineHeight: 19 },
  labelLarge: { fontFamily: Fonts.interSemiBold, fontSize: 15, lineHeight: 20 },
  labelMedium: { fontFamily: Fonts.interBold, fontSize: 12, lineHeight: 16 },
  labelSmall: { fontFamily: Fonts.interBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.88 },
} as const;

export interface Theme {
  isDark: boolean;
  colors: Colors;
  /** Solid phone-body fill for back-panel silhouettes: identical in light and dark by design. */
  phoneBody: string;
  phoneBodyBorder: string;
  /** Camera-bump "cutout" accent: reads clearly against the phone body in both modes. */
  cameraBumpAccent: string;
  myPhoneBackBody: string;
  myPhoneBackBorder: string;
  tapGuideBody: string;
  tapGuideBorder: string;
  darkCardBackground: string;
  darkCardSilhouette: string;
  screenInset: string;
  screenNotch: string;
  /** Theme for the library's marker components: the single aqua accent for both confidence looks (fill vs. outline carries the difference). */
  locatorTheme: NfcLocatorThemeInput;
  /** Marker theme for hardcoded-dark mockup cards (Home, Tap Test): always the light-mode aqua on dark. */
  darkMockupLocatorTheme: NfcLocatorThemeInput;
}

export function buildTheme(isDark: boolean): Theme {
  const colors = isDark ? darkColors : lightColors;
  const aqua = isDark ? Palette.AquaDark : Palette.Aqua;
  return {
    isDark,
    colors,
    phoneBody: Palette.PhoneBody,
    phoneBodyBorder: Palette.PhoneBodyBorder,
    cameraBumpAccent: isDark ? Palette.DarkSurfaceDeep : Palette.Ink,
    myPhoneBackBody: isDark ? Palette.PhoneBodyDark : Palette.PhoneBody,
    myPhoneBackBorder: isDark ? Palette.PhoneBodyBorderDark : Palette.PhoneBodyBorder,
    tapGuideBody: isDark ? Palette.ReaderOuterLight : Palette.PhoneBody,
    tapGuideBorder: isDark ? Palette.ReaderInnerLight : Palette.PhoneBodyBorder,
    darkCardBackground: isDark ? Palette.DarkSurfaceAlt : Palette.Ink,
    darkCardSilhouette: isDark ? Palette.DarkSurfaceDeep : Palette.Graphite,
    screenInset: isDark ? Palette.HardwareCutoutDark : Palette.ScreenInsetLight,
    screenNotch: isDark ? Palette.DarkSurfaceDeep : Palette.Ink,
    locatorTheme: {
      markerConfident: aqua,
      markerLowConfidence: aqua,
      silhouette: colors.outline,
      background: colors.background,
      text: colors.onBackground,
      textSecondary: colors.onSurfaceVariant,
      badge: {
        EXACT: { background: colors.primaryContainer, text: colors.onPrimaryContainer },
        APPROXIMATE: { background: colors.secondaryContainer, text: colors.onSecondaryContainer },
        GENERIC: { background: colors.tertiaryContainer, text: colors.onTertiaryContainer },
        UNKNOWN: { background: colors.surfaceVariant, text: colors.onSurfaceVariant },
      },
    },
    darkMockupLocatorTheme: { markerConfident: Palette.Aqua, markerLowConfidence: Palette.Aqua, silhouette: Palette.TextLightSecondary },
  };
}

const ThemeContext = createContext<Theme>(buildTheme(false));

export function ThemeProvider({ mode, children }: { mode: AppearanceMode; children: React.ReactNode }) {
  const system = useColorScheme();
  const isDark = mode === 'SYSTEM' ? system === 'dark' : mode === 'DARK';
  const theme = useMemo(() => buildTheme(isDark), [isDark]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): Theme => useContext(ThemeContext);
