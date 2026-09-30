import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { openNfcSettings } from './openNfcSettings';
import { useT } from '../i18n';
import { useActiveAntenna, useNfcState, greetingKey } from '../state/hooks';
import { Palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { AppText, AntennaMarker, ConfidenceChip, FilledButton, NfcUnsupportedNotice, OutlinedButton, TextButton, confidenceOf } from '../ui/components';
import { InfoIcon } from '../ui/Icons';
import { friendlyDeviceName } from '../util/displayNames';
import { ScrollScreen } from './Screen';

export function HomeScreen({ onStartTapGuide, onChangePhone, onTapNotWorking }: { onStartTapGuide: () => void; onChangePhone: () => void; onTapNotWorking: () => void }) {
  const t = useT();
  const theme = useTheme();
  const { colors } = theme;
  const antenna = useActiveAntenna();
  const nfc = useNfcState();
  const { profile } = antenna;
  const displayModel = profile ? friendlyDeviceName(profile.manufacturer, profile.model) : '';
  const confidence = confidenceOf(antenna.uiState);
  const showUnsupported = !antenna.isLoading && nfc.ready && !nfc.isSupported && !antenna.isManualOverride;
  // iOS has no user-facing NFC on/off toggle, so the status row is Android-only.
  const showNfcStatus = Platform.OS === 'android';

  return (
    <ScrollScreen bottom={false} contentStyle={{ paddingBottom: 24 }}>
      <View style={{ paddingTop: 12 }}>
        <AppText variant="bodySmall" color={colors.onSurfaceVariant}>
          {antenna.isManualOverride ? t('home_previewing_label') : t(greetingKey(new Date().getHours()))}
        </AppText>
        <AppText variant="headlineSmall" testID="home-model">{displayModel || ' '}</AppText>
      </View>

      <View style={[styles.darkCard, { backgroundColor: theme.darkCardBackground }]}>
        {antenna.isLoading ? (
          <ActivityIndicator color={Palette.Aqua} testID="home-loading" />
        ) : showUnsupported ? (
          <NfcUnsupportedNotice
            heading={t('home_nfc_unsupported')} body={t('home_nfc_unsupported_body')}
            iconBackground="rgba(255,255,255,0.08)" iconTint={Palette.TextLightSecondary} headingColor={Palette.TextLight} bodyColor={Palette.TextLightSecondary}
          />
        ) : (
          <>
            {confidence ? <View style={{ alignSelf: 'stretch', marginBottom: 14 }}><ConfidenceChip confidence={confidence} onDarkCard /></View> : null}
            {antenna.uiState.kind === 'error' ? null : (
              <AntennaMarker
                state={antenna.uiState} reducedMotion={antenna.reduceMotion} style={{ width: 120, height: 230, flex: 0 }}
                theme={theme.darkMockupLocatorTheme} silhouetteColor={theme.phoneBody} silhouetteBorderColor={theme.phoneBodyBorder} showCameraBump cameraBumpColor={theme.cameraBumpAccent}
              />
            )}
            <AppText variant="bodyMedium" color={Palette.TextLightSecondary} style={{ marginTop: 12 }}>
              {antenna.uiState.kind === 'fallbackGuidance' ? t('home_tap_area_estimated') : t('home_tap_area_recommended')}
            </AppText>
          </>
        )}
      </View>

      <View style={styles.row}>
        <FilledButton label={t('home_start_tap_guide')} onPress={onStartTapGuide} style={{ flex: 1 }} testID="home-start-guide" />
        <OutlinedButton label={t('home_change_phone')} onPress={onChangePhone} testID="home-change-phone" />
      </View>

      <View style={[styles.tip, { backgroundColor: colors.tertiaryContainer }]}>
        <InfoIcon size={24} color={colors.onTertiaryContainer} />
        <AppText variant="bodySmall" color={colors.onTertiaryContainer} style={{ flex: 1 }}>{t('home_tip_case')}</AppText>
      </View>

      {showNfcStatus ? (
        <View style={styles.statusRow}>
          <AppText variant="bodyMedium" onPress={nfc.isSupported ? openNfcSettings : undefined}>
            {!nfc.isSupported ? t('home_nfc_unsupported') : nfc.isEnabled ? t('home_nfc_status_on') : t('home_nfc_status_off')}
          </AppText>
          <View style={[styles.dot, { backgroundColor: nfc.isSupported && nfc.isEnabled ? Palette.Success : Palette.Ink3 }]} />
        </View>
      ) : null}
      <TextButton label={t('home_tap_not_working')} onPress={onTapNotWorking} style={{ alignSelf: 'stretch' }} testID="home-tap-not-working" />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  darkCard: { borderRadius: 28, padding: 24, marginVertical: 16, alignItems: 'center', alignSelf: 'stretch', minHeight: 120 },
  row: { flexDirection: 'row', gap: 10 },
  tip: { flexDirection: 'row', gap: 12, borderRadius: 18, padding: 16, marginTop: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
