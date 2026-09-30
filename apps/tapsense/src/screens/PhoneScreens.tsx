import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { DeviceAntennaProfile } from 'react-native-nfc-locator';
import { useT } from '../i18n';
import { useActiveAntenna } from '../state/hooks';
import { useEnv, useSettings } from '../state/context';
import { Palette } from '../theme/palette';
import { useTheme, type } from '../theme/theme';
import { AppText, CloseButton, ConfidenceChip, FilledButton, SegmentedToggle, TextButton } from '../ui/components';
import { CheckCircleIcon, SearchIcon } from '../ui/Icons';
import { matchesQuery } from '../data/PhoneCatalogRepository';
import { capitalizeFirst, friendlyModelName } from '../util/displayNames';
import { CloseRow, Screen } from './Screen';

export type PhoneOsFilter = 'ANDROID' | 'APPLE';

/** Android/Apple partition of the catalog, then the free-text search. */
export function filterPhones(all: DeviceAntennaProfile[], osFilter: PhoneOsFilter, query: string): DeviceAntennaProfile[] {
  return all.filter((p) => {
    const isApple = p.manufacturer.toLowerCase() === 'apple';
    return (osFilter === 'APPLE' ? isApple : !isApple) && matchesQuery(p, query);
  });
}

interface SelectionProps { onPhoneSelected: () => void; onUseMyPhone: () => void; onClose: () => void }

export function PhoneSelectionScreen({ onPhoneSelected, onUseMyPhone, onClose }: SelectionProps) {
  const t = useT();
  const theme = useTheme();
  const { colors, isDark } = theme;
  const env = useEnv();
  const { store } = useSettings();
  const [all, setAll] = useState<DeviceAntennaProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [osFilter, setOsFilter] = useState<PhoneOsFilter>('ANDROID');

  useEffect(() => {
    let alive = true;
    env.catalog.listAll().then(
      (list) => alive && (setAll(list), setLoading(false)),
      (e) => {
        // Catalog load failed entirely: degrade to the existing empty state, never crash or hang.
        env.logger.e('PhoneSelection', 'Failed to load phone catalog', e);
        if (alive) setLoading(false);
      },
    );
    return () => { alive = false; };
  }, [env]);

  const results = useMemo(() => filterPhones(all, osFilter, query), [all, osFilter, query]);
  const track = isDark ? Palette.ToggleTrackDark : Palette.LightSurfaceAlt;
  const selected = isDark ? Palette.ToggleTabSelectedDark : Palette.LightSurface;

  return (
    <Screen>
      <CloseRow><CloseButton onPress={onClose} accessibilityLabel={t('phone_selection_close_content_description')} testID="phone-selection-close" /></CloseRow>
      <AppText variant="headlineSmall" style={{ paddingHorizontal: 24, paddingVertical: 12 }} accessibilityRole="header">{t('phone_selection_title')}</AppText>
      <View style={{ paddingHorizontal: 24, paddingVertical: 8 }}>
        <SegmentedToggle<PhoneOsFilter> fill trackColor={track} selectedColor={selected}
          options={[{ value: 'ANDROID', label: t('phone_selection_filter_android') }, { value: 'APPLE', label: t('phone_selection_filter_apple') }]}
          selected={osFilter} onSelect={setOsFilter} />
      </View>
      <View style={[styles.search, { borderColor: colors.outline }]}>
        <SearchIcon size={22} color={colors.onSurfaceVariant} />
        <TextInput value={query} onChangeText={setQuery} placeholder={t('phone_selection_search_placeholder')} placeholderTextColor={colors.onSurfaceVariant}
          style={[type.bodyLarge, { flex: 1, color: colors.onSurface, paddingVertical: 12 }]} autoCorrect={false} autoCapitalize="none" returnKeyType="search" accessibilityLabel={t('phone_selection_search_placeholder')} testID="phone-search" />
      </View>
      <AppText variant="labelSmall" color={colors.onSurfaceVariant} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>{t('phone_selection_section_header')}</AppText>
      {loading ? (
        <View style={styles.fill}><ActivityIndicator /></View>
      ) : results.length === 0 ? (
        <View style={[styles.fill, { padding: 24 }]}><AppText variant="bodyMedium" color={colors.onSurfaceVariant}>{t('phone_selection_empty', query)}</AppText></View>
      ) : (
        <FlatList
          data={results} keyExtractor={(p) => `${p.manufacturer}:${p.model}`} style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 4, gap: 10 }}
          renderItem={({ item }) => (
            <PhoneRow profile={item} onPress={async () => { await store.setSelectedPhone(item.manufacturer, item.model, item.formFactor); onPhoneSelected(); }} />
          )}
        />
      )}
      <TextButton label={t('phone_selection_use_my_phone')} onPress={async () => { await store.clearSelectedPhone(); onUseMyPhone(); }} style={{ margin: 12 }} testID="phone-use-mine" />
    </Screen>
  );
}

function PhoneRow({ profile, onPress }: { profile: DeviceAntennaProfile; onPress: () => void }) {
  const { colors } = useTheme();
  const label = `${friendlyModelName(profile.model)}, ${capitalizeFirst(profile.manufacturer)}`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={`phone-row-${profile.manufacturer}-${profile.model}`}
      style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="titleSmall">{friendlyModelName(profile.model)}</AppText>
        <AppText variant="bodySmall" color={colors.onSurfaceVariant}>{capitalizeFirst(profile.manufacturer)}</AppText>
      </View>
      <ConfidenceChip confidence={profile.confidence} />
    </Pressable>
  );
}

export function PhoneConfirmedScreen({ onGoHome, onChooseDifferent }: { onGoHome: () => void; onChooseDifferent: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  const { store } = useSettings();
  // Left null (logged, not crashed) if resolution throws: the two actions never depend on it.
  const { profile } = useActiveAntenna();

  return (
    <Screen style={{ padding: 32, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.checkCircle, { backgroundColor: colors.primaryContainer }]}>
        <CheckCircleIcon size={36} color={colors.onPrimaryContainer} />
      </View>
      <AppText variant="headlineSmall" style={{ marginVertical: 20 }}>{t('phone_confirmed_title')}</AppText>
      <View style={[styles.confirmCard, { backgroundColor: colors.surface }]} testID="phone-confirmed-card">
        {!profile ? (
          <ActivityIndicator />
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
      {/* Idempotent: reachable from onboarding's detour and from Change phone; only the former needs it. */}
      <FilledButton label={t('phone_confirmed_go_home')} onPress={async () => { await store.setOnboardingCompleted(true); onGoHome(); }} style={{ alignSelf: 'stretch', marginTop: 24 }} testID="phone-confirmed-go-home" />
      <TextButton label={t('phone_confirmed_choose_different')} onPress={onChooseDifferent} style={{ alignSelf: 'stretch' }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, marginHorizontal: 24, paddingHorizontal: 12 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, minHeight: 48 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  confirmCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, alignSelf: 'stretch' },
});
