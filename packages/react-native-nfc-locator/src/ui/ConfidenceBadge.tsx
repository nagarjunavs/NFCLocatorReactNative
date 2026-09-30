import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Confidence } from '../domain/model/enums';
import type { StringKey } from '../i18n';
import { useTranslator } from './context';
import { type NfcLocatorThemeInput, useNfcLocatorTheme } from './theme';

const LABEL_KEYS: Record<Confidence, StringKey> = {
  EXACT: 'nfc_locator_confidence_exact',
  APPROXIMATE: 'nfc_locator_confidence_approximate',
  GENERIC: 'nfc_locator_confidence_generic',
  UNKNOWN: 'nfc_locator_confidence_unknown',
};

/**
 * Small pill labeling how much to trust the marker/zone. Exists so a GENERIC or UNKNOWN
 * state is never visually indistinguishable from a confident one.
 */
export function ConfidenceBadge({ confidence, style, theme, locale }: { confidence: Confidence; style?: StyleProp<ViewStyle>; theme?: NfcLocatorThemeInput; locale?: string | null }) {
  const t = useTranslator(locale);
  const colors = useNfcLocatorTheme(theme);
  const label = t(LABEL_KEYS[confidence]);
  const c = colors.badge[confidence];
  return (
    <View style={[styles.pill, { backgroundColor: c.background }, style]} accessible accessibilityLabel={label} testID="nfc-confidence-badge">
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
