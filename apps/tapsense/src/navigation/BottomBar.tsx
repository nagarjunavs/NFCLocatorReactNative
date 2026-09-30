import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useTheme } from '../theme/theme';
import { AppText, TapSenseLogo } from '../ui/components';
import { HomeIcon, MyPhoneIcon, SettingsIcon } from '../ui/Icons';

/** Routes that show the persistent bottom bar (a flat route table; the bar is shown per route). */
export const BOTTOM_BAR_ROUTES: readonly string[] = ['Home', 'MyPhone', 'Settings'];

interface Props {
  currentRoute: string | undefined;
  onHome: () => void;
  onMyPhone: () => void;
  onTapGuide: () => void;
  onSettings: () => void;
}

/**
 * Home / My Phone / a center Tap Guide action / Settings. Tap Guide is a full-screen flow
 * pushed onto the stack, not a tab whose content stays mounted. The background is a plain
 * View (not a clipping container) so the FAB's circle floats above the bar without being cut.
 */
export function BottomBar({ currentRoute, onHome, onMyPhone, onTapGuide, onSettings }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.surface, paddingBottom: insets.bottom }} testID="bottom-bar">
      <View style={styles.row}>
        <Item label={t('nav_home')} selected={currentRoute === 'Home'} onPress={onHome} icon={(c) => <HomeIcon color={c} />} testID="tab-home" />
        <Item label={t('nav_my_phone')} selected={currentRoute === 'MyPhone'} onPress={onMyPhone} icon={(c) => <MyPhoneIcon color={c} />} testID="tab-my-phone" />
        <View style={styles.fabColumn}>
          <Pressable onPress={onTapGuide} accessibilityRole="button" accessibilityLabel={t('nav_tap_guide')} testID="tab-tap-guide"
            style={[styles.fab, { backgroundColor: colors.primary }]}>
            <TapSenseLogo color={colors.onPrimary} size={24} singleRing />
          </Pressable>
          <AppText variant="labelSmall" color={colors.primary} style={{ marginTop: -10 }}>{t('nav_tap_guide')}</AppText>
        </View>
        <Item label={t('nav_settings')} selected={currentRoute === 'Settings'} onPress={onSettings} icon={(c) => <SettingsIcon color={c} />} testID="tab-settings" />
      </View>
    </View>
  );
}

function Item({ label, selected, onPress, icon, testID }: { label: string; selected: boolean; onPress: () => void; icon: (color: string) => React.ReactNode; testID: string }) {
  const { colors } = useTheme();
  const color = selected ? colors.onSurface : colors.onSurfaceVariant;
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={label} testID={testID} style={styles.item}>
      <View style={{ padding: 4 }}>{icon(color)}</View>
      <AppText variant="labelSmall" color={color}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Top padding must be >= the FAB's upward offset (14) so its circle lands flush with the container's top edge.
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingLeft: 12, paddingRight: 12, paddingTop: 14, paddingBottom: 10 },
  item: { alignItems: 'center', padding: 4, minWidth: 48, minHeight: 48 },
  fabColumn: { alignItems: 'center' },
  fab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -14 }] },
});
