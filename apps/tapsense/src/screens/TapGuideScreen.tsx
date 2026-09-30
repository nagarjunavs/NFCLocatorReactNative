import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useT, type AppStringKey } from '../i18n';
import { useActiveAntenna, useNfcState } from '../state/hooks';
import { Palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { AppText, AntennaMarker, CloseButton, FilledButton, ReaderDeviceIllustration } from '../ui/components';
import { CloseRow, Screen } from './Screen';

export const TAP_GUIDE_STEPS: ReadonlyArray<{ title: AppStringKey; body: AppStringKey }> = [
  { title: 'tap_guide_step1_title', body: 'tap_guide_step1_body' },
  { title: 'tap_guide_step2_title', body: 'tap_guide_step2_body' },
  { title: 'tap_guide_step3_title', body: 'tap_guide_step3_body' },
  { title: 'tap_guide_step4_title', body: 'tap_guide_step4_body' },
  { title: 'tap_guide_step5_title', body: 'tap_guide_step5_body' },
];

/**
 * The whole phone silhouette wobbles side to side: a "move your phone to find the reader" motion
 * cue, independent of confidence. Matches the design's tsSweep keyframe: +-6, ease-in-out, ~2.4s.
 */
function useSweepOffset(reducedMotion: boolean): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      v.setValue(0);
      return;
    }
    v.setValue(-6);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: -6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, v]);
  return v;
}

export function TapGuideScreen({ onRunTapTest, onClose, onNfcUnsupported }: { onRunTapTest: () => void; onClose: () => void; onNfcUnsupported: () => void }) {
  const t = useT();
  const theme = useTheme();
  const { colors, isDark } = theme;
  const antenna = useActiveAntenna();
  const nfc = useNfcState();
  const [step, setStep] = useState(0);
  const sweep = useSweepOffset(antenna.reduceMotion);

  // The walkthrough always ends in a real physical tap test, which needs live NFC hardware
  // regardless of which phone is previewed: skip straight to Tap Test's own "no NFC" screen.
  useEffect(() => {
    if (nfc.ready && !nfc.isSupported) onNfcUnsupported();
  }, [nfc.ready, nfc.isSupported, onNfcUnsupported]);

  const current = TAP_GUIDE_STEPS[step]!;
  const last = step === TAP_GUIDE_STEPS.length - 1;

  return (
    <Screen>
      <CloseRow><CloseButton onPress={onClose} accessibilityLabel={t('tap_guide_close_content_description')} testID="tap-guide-close" /></CloseRow>
      <View style={styles.visual}>
        {antenna.uiState.kind !== 'loading' && antenna.uiState.kind !== 'error' ? (
          <>
            <Animated.View style={{ transform: [{ translateX: sweep }] }}>
              <AntennaMarker state={antenna.uiState} reducedMotion={antenna.reduceMotion} style={{ width: 140, height: 300, flex: 0 }}
                silhouetteColor={theme.tapGuideBody} silhouetteBorderColor={theme.tapGuideBorder} showCameraBump cameraBumpColor={theme.cameraBumpAccent} />
            </Animated.View>
            <ReaderDeviceIllustration outerColor={isDark ? Palette.ReaderOuter : Palette.ReaderOuterLight} innerColor={isDark ? Palette.ReaderInner : Palette.ReaderInnerLight} size={150} />
          </>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 28 }} accessibilityLiveRegion="polite">
        <AppText variant="labelMedium" color={colors.primary}>{t('tap_guide_step_of', step + 1, TAP_GUIDE_STEPS.length)}</AppText>
        <AppText variant="titleLarge" color={colors.onBackground} style={{ marginTop: 8 }}>{t(current.title)}</AppText>
        <AppText variant="bodyMedium" color={colors.onSurfaceVariant} style={{ marginTop: 8, marginBottom: 16 }}>{t(current.body)}</AppText>
      </View>
      <View style={styles.progress}>
        {TAP_GUIDE_STEPS.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.outline }} />
        ))}
      </View>
      <View style={{ padding: 24 }}>
        {last ? (
          <FilledButton label={t('tap_guide_step5_action')} onPress={onRunTapTest} testID="tap-guide-run-test" />
        ) : (
          <FilledButton label={t('tap_guide_next')} onPress={() => setStep((s) => s + 1)} testID="tap-guide-next" />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 28 },
});
