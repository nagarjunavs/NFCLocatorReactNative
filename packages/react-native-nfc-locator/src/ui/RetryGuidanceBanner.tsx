import React, { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslator } from './context';
import { type NfcLocatorThemeInput, useNfcLocatorTheme } from './theme';

/**
 * Shown after a failed unlock/read attempt, prompting the user to reposition using the
 * guidance already on screen. Hosts are expected to call `analytics.retryGuidanceShown` when
 * it appears. A polite live region so screen readers announce it without the user hunting.
 */
export function RetryGuidanceBanner({ style, theme, locale }: { style?: StyleProp<ViewStyle>; theme?: NfcLocatorThemeInput; locale?: string | null }) {
  const t = useTranslator(locale);
  const colors = useNfcLocatorTheme(theme);
  const title = t('nfc_locator_retry_guidance_title');
  const body = t('nfc_locator_retry_guidance_body');

  useEffect(() => {
    // Android honors accessibilityLiveRegion; iOS VoiceOver needs an explicit announcement.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility?.(`${title}. ${body}`);
  }, [title, body]);

  return (
    <View
      style={[styles.box, { backgroundColor: colors.errorContainer }, style]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${body}`}
      testID="nfc-retry-banner"
    >
      <Text style={[styles.title, { color: colors.onErrorContainer }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.onErrorContainer }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  body: { fontSize: 14 },
});
