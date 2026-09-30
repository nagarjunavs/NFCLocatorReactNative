import React, { useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DataSource } from '../domain/model/enums';
import { AntennaSilhouette } from './AntennaSilhouette';
import { ConfidenceBadge } from './ConfidenceBadge';
import { GuidedSweepAnimation } from './GuidedSweepAnimation';
import { useTranslator } from './context';
import { useReducedMotion } from './motion';
import type { AntennaLocatorUiState } from './state';
import { type NfcLocatorThemeInput, useNfcLocatorTheme } from './theme';

/** Caps silhouette height so a tall/narrow template can't push the hint text off screen. */
export const MAX_SILHOUETTE_HEIGHT = 340;

export interface AntennaLocatorScreenProps {
  state: AntennaLocatorUiState;
  onRetry: () => void;
  reducedMotion?: boolean;
  theme?: NfcLocatorThemeInput;
  locale?: string | null;
}

/**
 * Top-level guidance screen. Stateless by design (state hoisted; no data-fetching here), so
 * the host owns the lifecycle-aware state holder. Confidence-aware rendering is the point:
 * `resolvedMarker` gets a marker (solid when trustworthy, badge-flagged and sweep-assisted when
 * stale); `fallbackGuidance` always gets the guided sweep, never a fixed marker.
 */
export function AntennaLocatorScreen({ state, onRetry, reducedMotion, theme, locale }: AntennaLocatorScreenProps) {
  const t = useTranslator(locale);
  const colors = useNfcLocatorTheme(theme);
  const reduced = useReducedMotion(reducedMotion);

  useEffect(() => {
    // iOS has no live regions: announce the resolved state so VoiceOver users hear the outcome.
    if (Platform.OS !== 'ios' || state.kind === 'loading') return;
    const msg =
      state.kind === 'error'
        ? t('nfc_locator_error_title')
        : state.kind === 'resolvedMarker'
        ? t(state.confidence === 'EXACT' ? 'nfc_locator_confidence_exact' : 'nfc_locator_confidence_approximate')
        : t('nfc_locator_confidence_generic');
    AccessibilityInfo.announceForAccessibility?.(msg);
  }, [state.kind, t, state]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityLiveRegion="polite" testID="nfc-locator-screen">
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {t('nfc_locator_screen_title')}
      </Text>
      {state.kind === 'loading' && (
        <View accessible accessibilityLabel={t('nfc_locator_loading_content_description')} testID="nfc-loading">
          <ActivityIndicator color={colors.markerConfident} />
        </View>
      )}
      {state.kind === 'error' && (
        <>
          <Text style={[styles.subtitle, { color: colors.text }]}>{t('nfc_locator_error_title')}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{t('nfc_locator_error_body')}</Text>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={t('nfc_locator_retry_button')}
            style={[styles.button, { backgroundColor: colors.button }]}
            testID="nfc-retry-button"
          >
            <Text style={[styles.buttonText, { color: colors.onButton }]}>{t('nfc_locator_retry_button')}</Text>
          </Pressable>
        </>
      )}
      {state.kind === 'resolvedMarker' && (
        <>
          <ConfidenceBadge confidence={state.confidence} theme={theme} locale={locale} />
          {/* isConfident === "not stale": ResolvedMarker only carries EXACT/APPROXIMATE, and
              stale only ever applies to APPROXIMATE past the window. */}
          <AntennaSilhouette
            templateId={state.silhouetteTemplateId}
            zone={state.antennaZone}
            isConfident={!state.isStale}
            style={styles.silhouette}
            reducedMotion={reduced}
            aspectRatioOverride={state.aspectRatio}
            theme={theme}
            locale={locale}
          />
          <Text style={[styles.body, { color: colors.text }]} testID="nfc-hint">
            {t(
              state.isStale
                ? 'nfc_locator_marker_stale_hint'
                : state.confidence === 'APPROXIMATE'
                ? 'nfc_locator_marker_approximate_hint'
                : // EXACT is either an on-device measurement or a vendor-verified catalog
                  // entry; both get a solid marker, but the hint text says which.
                  state.source === DataSource.ANDROID14_API
                ? 'nfc_locator_marker_exact_hint'
                : 'nfc_locator_marker_verified_hint',
            )}
          </Text>
          {state.isStale && (
            <GuidedSweepAnimation
              templateId={state.silhouetteTemplateId}
              zone={state.antennaZone}
              style={styles.silhouette}
              reducedMotion={reduced}
              aspectRatioOverride={state.aspectRatio}
              theme={theme}
              locale={locale}
            />
          )}
        </>
      )}
      {state.kind === 'fallbackGuidance' && (
        <>
          <ConfidenceBadge confidence={state.confidence} theme={theme} locale={locale} />
          <GuidedSweepAnimation
            templateId={state.silhouetteTemplateId}
            zone={state.approximateZone}
            style={styles.silhouette}
            reducedMotion={reduced}
            aspectRatioOverride={state.aspectRatio}
            theme={theme}
            locale={locale}
          />
          <Text style={[styles.body, { color: colors.text }]} testID="nfc-hint">
            {t(state.tipTextKey)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: '600' },
  subtitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, textAlign: 'center' },
  silhouette: { alignSelf: 'stretch', height: MAX_SILHOUETTE_HEIGHT, flex: 0 },
  button: { minHeight: 48, minWidth: 48, paddingHorizontal: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '600' },
});
