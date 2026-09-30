import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useT } from '../i18n';
import { hasManualPhoneOverride, type AppearanceMode } from '../data/settings';
import { useNfcState } from '../state/hooks';
import { useSettings } from '../state/context';
import { Palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { AppText, MIN_TOUCH } from '../ui/components';
import { friendlyModelName } from '../util/displayNames';
import { openNfcSettings } from './openNfcSettings';
import { ScrollScreen } from './Screen';

export const APP_VERSION = '1.0.0';

interface Props {
  onPhoneModelClick: () => void;
  onHelpCenterClick: () => void;
  onContactSupportClick: () => void;
  onRateAppClick: () => void;
  onPrivacyClick: () => void;
  versionName?: string;
}

export function SettingsScreen({ onPhoneModelClick, onHelpCenterClick, onContactSupportClick, onRateAppClick, onPrivacyClick, versionName = APP_VERSION }: Props) {
  const t = useT();
  const { colors, isDark } = useTheme();
  const { settings, store } = useSettings();
  const nfc = useNfcState();
  const phoneLabel = hasManualPhoneOverride(settings) ? friendlyModelName(settings.selectedPhoneModel ?? '') : t('settings_phone_auto');
  const switchColors = {
    trackColor: { false: isDark ? Palette.SwitchOffTrackDark : Palette.SwitchOffTrackLight, true: colors.primary },
    thumbColor: isDark ? Palette.SwitchOffThumbDark : colors.surface,
    ios_backgroundColor: isDark ? Palette.SwitchOffTrackDark : Palette.SwitchOffTrackLight,
  };
  const chevron = <AppText variant="bodyMedium" color={colors.onSurfaceVariant}>›</AppText>;
  // iOS has no NFC toggle to show or open, so this row is Android-only.
  const showNfcRow = Platform.OS === 'android';

  return (
    <ScrollScreen bottom={false}>
      <AppText variant="headlineSmall" style={{ paddingTop: 12, paddingBottom: 8 }} accessibilityRole="header">{t('settings_title')}</AppText>

      <Row label={t('settings_phone_model')} onPress={onPhoneModelClick} testID="settings-phone-model">
        <AppText variant="bodyMedium" color={colors.onSurfaceVariant}>{`${phoneLabel}  ›`}</AppText>
      </Row>
      <Divider />
      {showNfcRow ? (
        <>
          <Row label={t('settings_nfc_status')} onPress={nfc.isSupported ? openNfcSettings : undefined}>
            <AppText variant="bodyMedium" color={nfc.isSupported && nfc.isEnabled ? colors.primary : colors.onSurfaceVariant}>
              {!nfc.isSupported ? t('settings_nfc_not_supported') : nfc.isEnabled ? t('settings_nfc_on') : t('settings_nfc_off')}
            </AppText>
          </Row>
          <Divider />
        </>
      ) : null}
      <Row label={t('settings_haptics')}>
        <Switch value={settings.hapticsEnabled} onValueChange={(v) => void store.setHapticsEnabled(v)} accessibilityLabel={t('settings_haptics')} testID="settings-haptics" {...switchColors} />
      </Row>
      <Divider />
      <Row label={t('settings_reduce_motion')}>
        <Switch value={settings.reduceMotion} onValueChange={(v) => void store.setReduceMotion(v)} accessibilityLabel={t('settings_reduce_motion')} testID="settings-reduce-motion" {...switchColors} />
      </Row>
      <Divider />
      <View style={{ paddingVertical: 12 }}>
        <AppText variant="bodyMedium">{t('settings_appearance')}</AppText>
        <View style={styles.chips}>
          {(['SYSTEM', 'LIGHT', 'DARK'] as AppearanceMode[]).map((mode) => (
            <Chip key={mode} label={t(mode === 'SYSTEM' ? 'settings_appearance_system' : mode === 'LIGHT' ? 'settings_appearance_light' : 'settings_appearance_dark')}
              selected={settings.appearanceMode === mode} onPress={() => void store.setAppearanceMode(mode)} testID={`settings-appearance-${mode.toLowerCase()}`} />
          ))}
        </View>
      </View>
      <Divider />
      <Row label={t('settings_help_center')} onPress={onHelpCenterClick} testID="settings-help">{chevron}</Row>
      <Divider />
      <Row label={t('settings_contact_support')} onPress={onContactSupportClick}>{chevron}</Row>
      <Divider />
      <Row label={t('settings_rate_app')} onPress={onRateAppClick}>{chevron}</Row>
      <Divider />
      <Row label={t('settings_privacy')} onPress={onPrivacyClick}>{chevron}</Row>
      <AppText variant="bodySmall" color={colors.onSurfaceVariant} style={{ paddingVertical: 16 }}>{t('settings_version', versionName)}</AppText>
    </ScrollScreen>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.outline }} />;
}

function Row({ label, onPress, children, testID }: { label: string; onPress?: () => void; children: React.ReactNode; testID?: string }) {
  const content = (
    <>
      <AppText variant="bodyMedium" style={{ flexShrink: 1 }}>{label}</AppText>
      {children}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={styles.row}>{content}</Pressable>
  ) : (
    <View style={styles.row} testID={testID}>{content}</View>
  );
}

function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} testID={testID}
      style={[styles.chip, { borderColor: colors.outline }, selected && { backgroundColor: colors.secondaryContainer, borderColor: 'transparent' }]}>
      <AppText variant="labelLarge" color={selected ? colors.onSecondaryContainer : colors.onSurface}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, minHeight: MIN_TOUCH },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center' },
});
