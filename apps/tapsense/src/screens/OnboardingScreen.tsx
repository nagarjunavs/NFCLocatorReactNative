import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, type ScrollViewInstance, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useT } from '../i18n';
import { useActiveAntenna } from '../state/hooks';
import { useSettings } from '../state/context';
import { Palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { AppText, AntennaMarker, ConfidenceChip, FilledButton, ReaderDeviceIllustration, TextButton } from '../ui/components';
import { capitalizeFirst, friendlyModelName } from '../util/displayNames';
import { Screen } from './Screen';

interface Props {
  /** Skip: complete onboarding and land on Home. */
  onDone: () => void;
  /** "Try the guided walkthrough": complete onboarding, land on Home, then push Tap Guide. */
  onStartGuidedWalkthrough: () => void;
  onChooseDifferentPhone: () => void;
}

const PAGE_COUNT = 3;

export function OnboardingScreen({ onDone, onStartGuidedWalkthrough, onChooseDifferentPhone }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const { store } = useSettings();
  // Onboarding always previews the real running device, never a manual pick.
  const antenna = useActiveAntenna({ useOverride: false });
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);

  const complete = async (then: () => void) => {
    await store.setOnboardingCompleted(true);
    then();
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  return (
    <Screen>
      <View style={styles.skipRow}>
        <TextButton label={t('onboarding_skip')} onPress={() => complete(onDone)} testID="onboarding-skip" />
      </View>
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }} testID="onboarding-pager">
        <Page width={width} title={t('onboarding_page1_title')} body={t('onboarding_page1_body')} antenna={antenna} visualSize={{ w: 150, h: 320 }} />
        <Page width={width} title={t('onboarding_page2_title')} body={t('onboarding_page2_body')} antenna={antenna} visualSize={{ w: 130, h: 280 }} withReader />
        <Page width={width} title={t('onboarding_page3_title')} body={t('onboarding_page3_body')} antenna={antenna} visualSize={{ w: 140, h: 300 }} finalPage />
      </ScrollView>
      <PageIndicator count={PAGE_COUNT} current={page} />
      <View style={{ paddingHorizontal: 24, paddingVertical: 8 }}>
        {page < PAGE_COUNT - 1 ? (
          <FilledButton label={t('onboarding_continue')} onPress={() => goTo(page + 1)} testID="onboarding-continue" />
        ) : (
          <>
            <FilledButton label={t('onboarding_start_walkthrough')} onPress={() => complete(onStartGuidedWalkthrough)} testID="onboarding-start-walkthrough" />
            <TextButton label={t('phone_confirmed_choose_different')} onPress={onChooseDifferentPhone} style={{ alignSelf: 'stretch' }} />
          </>
        )}
      </View>
      <View style={{ height: 8, backgroundColor: colors.background }} />
    </Screen>
  );
}

function Page({ width, title, body, antenna, visualSize, withReader, finalPage }: {
  width: number; title: string; body: string; antenna: ReturnType<typeof useActiveAntenna>; visualSize: { w: number; h: number }; withReader?: boolean; finalPage?: boolean;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors } = theme;
  const profile = antenna.profile;
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {withReader ? (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Visual antenna={antenna} w={visualSize.w} h={visualSize.h} />
          <ReaderDeviceIllustration outerColor={Palette.ReaderOuter} innerColor={Palette.ReaderInner} size={120} />
        </View>
      ) : (
        <Visual antenna={antenna} w={visualSize.w} h={visualSize.h} />
      )}
      <View style={{ height: finalPage ? 24 : 32 }} />
      <AppText variant="headlineLarge" style={{ textAlign: 'center', alignSelf: 'stretch' }}>{title}</AppText>
      <View style={{ height: 12 }} />
      <AppText variant="bodyLarge" color={colors.onSurfaceVariant} style={{ textAlign: 'center', alignSelf: 'stretch', marginBottom: finalPage ? 24 : 0 }}>{body}</AppText>
      {finalPage ? (
        <View style={[styles.deviceCard, { backgroundColor: colors.surface }]}>
          {!profile ? (
            <AppText variant="bodyMedium">{t('phone_selection_loading')}</AppText>
          ) : (
            <>
              <View style={{ flex: 1 }}>
                <AppText variant="titleSmall">{friendlyModelName(profile.model)}</AppText>
                <AppText variant="bodySmall" color={colors.onSurfaceVariant}>{capitalizeFirst(profile.manufacturer)}</AppText>
              </View>
              <ConfidenceChip confidence={profile.confidence} />
            </>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

/**
 * The real per-device marker (the same AntennaMarker every other screen renders) once resolved,
 * a spinner beforehand: a wrong-looking marker during the very first thing a new user sees would
 * be worse than a brief wait.
 */
function Visual({ antenna, w, h }: { antenna: ReturnType<typeof useActiveAntenna>; w: number; h: number }) {
  const theme = useTheme();
  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }} testID="onboarding-visual">
      {antenna.isLoading || antenna.uiState.kind === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} size="large" />
      ) : antenna.uiState.kind === 'error' ? null : (
        <AntennaMarker state={antenna.uiState} reducedMotion={antenna.reduceMotion} style={{ width: w, height: h, flex: 0 }}
          silhouetteColor={theme.tapGuideBody} silhouetteBorderColor={theme.tapGuideBorder} showCameraBump cameraBumpColor={theme.cameraBumpAccent} />
      )}
    </View>
  );
}

function PageIndicator({ count, current }: { count: number; current: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.indicator} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: count, now: current + 1 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ marginHorizontal: 3, height: 6, width: i === current ? 20 : 6, borderRadius: 3, backgroundColor: i === current ? colors.secondary : colors.outline }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  indicator: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 20 },
  deviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, alignSelf: 'stretch' },
});
