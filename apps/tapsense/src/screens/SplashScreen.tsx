import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettings } from '../state/context';
import { useT } from '../i18n';
import { Palette } from '../theme/palette';
import { AppText, TapSenseLogo } from '../ui/components';

/** Minimum time the splash stays visible. */
export const SPLASH_MIN_VISIBLE_MS = 1100;

export function SplashScreen({ onNavigate }: { onNavigate: (destination: 'Home' | 'Onboarding') => void }) {
  const t = useT();
  const { settings, ready } = useSettings();

  useEffect(() => {
    if (!ready) return;
    const h = setTimeout(() => onNavigate(settings.onboardingCompleted ? 'Home' : 'Onboarding'), SPLASH_MIN_VISIBLE_MS);
    return () => clearTimeout(h);
  }, [ready, settings.onboardingCompleted, onNavigate]);

  return (
    <View style={styles.root} testID="splash-screen">
      <TapSenseLogo color={Palette.Aqua} pulsing reducedMotion={settings.reduceMotion} />
      <View style={{ height: 24 }} />
      <AppText variant="headlineLarge" color={Palette.TextLight}>TapSense</AppText>
      <AppText variant="bodyMedium" color={Palette.TextLightSecondary}>{t('app_tagline')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.DarkBg },
});
