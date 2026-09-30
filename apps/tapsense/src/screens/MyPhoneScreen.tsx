import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useT } from '../i18n';
import { useActiveAntenna, useNfcState } from '../state/hooks';
import { Palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { AppText, AntennaMarker, ConfidenceChip, FilledButton, NfcUnsupportedNotice, PhoneSilhouette, SegmentedToggle, confidenceOf } from '../ui/components';
import { friendlyManufacturerName, friendlyModelName } from '../util/displayNames';
import { ScrollScreen } from './Screen';

type Side = 'BACK' | 'FRONT';

export function MyPhoneScreen({ onTestLocation }: { onTestLocation: () => void }) {
  const t = useT();
  const theme = useTheme();
  const { colors } = theme;
  const antenna = useActiveAntenna();
  const nfc = useNfcState();
  const [side, setSide] = useState<Side>('BACK');
  const { profile } = antenna;
  const confidence = confidenceOf(antenna.uiState);
  // A device with no NFC hardware has no antenna on either side, so the toggle is moot.
  const showUnsupported = !antenna.isLoading && nfc.ready && !nfc.isSupported && !antenna.isManualOverride;
  const track = theme.isDark ? Palette.ToggleTrackDark : Palette.ToggleTrackLight;
  const selectedTab = theme.isDark ? Palette.ToggleTabSelectedDark : colors.surface;

  return (
    <ScrollScreen bottom={false}>
      <View style={{ paddingTop: 12, paddingBottom: 8 }}>
        <AppText variant="bodySmall" color={colors.onSurfaceVariant}>{profile ? friendlyManufacturerName(profile.manufacturer) : ' '}</AppText>
        <AppText variant="headlineSmall" testID="myphone-model">{profile ? friendlyModelName(profile.model) : ' '}</AppText>
      </View>

      {!showUnsupported ? (
        <View style={{ paddingVertical: 8 }}>
          <SegmentedToggle<Side>
            options={[{ value: 'BACK', label: t('my_phone_tab_back') }, { value: 'FRONT', label: t('my_phone_tab_front') }]}
            selected={side} onSelect={setSide} trackColor={track} selectedColor={selectedTab}
          />
        </View>
      ) : null}

      {antenna.isLoading ? (
        <View style={styles.center280}><ActivityIndicator /></View>
      ) : showUnsupported ? (
        <View style={styles.center280}><NfcUnsupportedNotice heading={t('home_nfc_unsupported')} body={t('my_phone_nfc_unsupported_body')} /></View>
      ) : side === 'FRONT' ? (
        <>
          <View style={styles.centerRow}>
            <PhoneSilhouette color={theme.darkCardSilhouette} width={150} height={300} screenInset insetColor={theme.screenInset} notchColor={theme.screenNotch} />
          </View>
          <View style={[styles.centerRow, { marginTop: 14 }]}><NotApplicableBadge /></View>
          <AppText variant="bodyMedium" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 8 }}>{t('my_phone_front_body')}</AppText>
          <View style={[styles.banner, { backgroundColor: colors.surfaceVariant, borderRadius: 16 }]}>
            <AppText variant="bodySmall" color={colors.onSurfaceVariant}>{t('my_phone_front_banner')}</AppText>
          </View>
          <FilledButton label={t('my_phone_view_back_placement')} onPress={() => setSide('BACK')} style={{ marginTop: 20 }} />
        </>
      ) : (
        <>
          <View style={styles.centerRow}>
            {antenna.uiState.kind === 'error' ? null : (
              <AntennaMarker
                state={antenna.uiState} reducedMotion={antenna.reduceMotion} style={{ width: 150, height: 300, flex: 0 }}
                theme={theme.darkMockupLocatorTheme} silhouetteColor={theme.myPhoneBackBody} silhouetteBorderColor={theme.myPhoneBackBorder} showCameraBump cameraBumpColor={theme.cameraBumpAccent}
              />
            )}
          </View>
          {confidence ? <View style={[styles.centerRow, { marginTop: 14 }]}><ConfidenceChip confidence={confidence} /></View> : null}
          <AppText variant="bodyMedium" color={colors.onSurfaceVariant} style={{ marginTop: 8 }}>{t('my_phone_zone_description')}</AppText>
          <View style={[styles.banner, { backgroundColor: colors.tertiaryContainer, borderRadius: 16 }]}>
            <AppText variant="bodySmall" color={colors.onTertiaryContainer}>{t('my_phone_case_warning')}</AppText>
          </View>
          <View style={{ marginTop: 16 }}>
            <AppText variant="labelSmall" color={colors.onSurfaceVariant}>{t('my_phone_orientation_header')}</AppText>
            <View style={styles.orientationRow}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <AppText variant="bodyMedium">{t('my_phone_orientation_back_contact')}</AppText>
            </View>
          </View>
          <FilledButton label={t('my_phone_test_location')} onPress={onTestLocation} style={{ marginTop: 16 }} testID="myphone-test-location" />
        </>
      )}
    </ScrollScreen>
  );
}

/** The Front tab's "this isn't the antenna side" indicator: UI-only, not a resolver confidence tier. */
function NotApplicableBadge() {
  const t = useT();
  const { colors, isDark } = useTheme();
  const iconColor = isDark ? Palette.TextLightSecondary : Palette.Ink3;
  return (
    <View style={[styles.naBadge, { backgroundColor: colors.surfaceVariant }]}>
      <Svg width={10} height={10} accessible={false}><Circle cx={5} cy={5} r={4.3} stroke={iconColor} strokeWidth={1.4} fill="none" /></Svg>
      <AppText variant="labelSmall" color={colors.onSurfaceVariant}>{t('my_phone_not_applicable')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center280: { height: 280, alignItems: 'center', justifyContent: 'center' },
  centerRow: { flexDirection: 'row', justifyContent: 'center' },
  banner: { padding: 12, marginTop: 12 },
  orientationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  naBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
});
