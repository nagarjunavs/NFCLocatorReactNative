import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT, type AppStringKey } from '../i18n';
import { useTheme } from '../theme/theme';
import { AppText, CloseButton, MIN_TOUCH } from '../ui/components';
import { CloseRow, Screen, ScrollBody } from './Screen';

export type TroubleshootIssue = 'NO_REACTION' | 'READER_SILENT' | 'PAY_FAILING' | 'CANNOT_SCAN' | 'DONT_KNOW_WHERE' | 'MODEL_MISSING';

export const TROUBLESHOOT_ISSUES: ReadonlyArray<{ issue: TroubleshootIssue; label: AppStringKey }> = [
  { issue: 'NO_REACTION', label: 'troubleshoot_issue_no_reaction' },
  { issue: 'READER_SILENT', label: 'troubleshoot_issue_reader_silent' },
  { issue: 'PAY_FAILING', label: 'troubleshoot_issue_pay_failing' },
  { issue: 'CANNOT_SCAN', label: 'troubleshoot_issue_cannot_scan' },
  { issue: 'DONT_KNOW_WHERE', label: 'troubleshoot_issue_dont_know_where' },
  { issue: 'MODEL_MISSING', label: 'troubleshoot_issue_model_missing' },
];

export type TroubleshootAction = 'OPEN_NFC_SETTINGS' | 'RUN_TAP_TEST' | 'VIEW_TAP_ZONE' | 'CHOOSE_PHONE' | 'LEARN_MORE';

/**
 * Contextual, real actions per issue: not just static tips. Opening NFC settings only makes
 * sense (and only resolves to a screen) on a device with NFC hardware.
 */
export function actionsFor(issue: TroubleshootIssue, isNfcSupported: boolean): TroubleshootAction[] {
  switch (issue) {
    case 'NO_REACTION':
    case 'READER_SILENT':
    case 'PAY_FAILING':
      return [...(isNfcSupported ? (['OPEN_NFC_SETTINGS'] as const) : []), 'RUN_TAP_TEST'];
    case 'CANNOT_SCAN':
      return ['RUN_TAP_TEST', 'VIEW_TAP_ZONE'];
    case 'DONT_KNOW_WHERE':
      return ['VIEW_TAP_ZONE', 'LEARN_MORE'];
    case 'MODEL_MISSING':
      return ['CHOOSE_PHONE'];
  }
}

const ACTION_LABELS: Record<TroubleshootAction, AppStringKey> = {
  OPEN_NFC_SETTINGS: 'troubleshoot_action_open_nfc_settings',
  RUN_TAP_TEST: 'troubleshoot_action_run_tap_test',
  VIEW_TAP_ZONE: 'troubleshoot_action_view_tap_zone',
  CHOOSE_PHONE: 'troubleshoot_action_choose_phone',
  LEARN_MORE: 'troubleshoot_action_learn_more',
};

interface TroubleshootProps {
  isNfcSupported: boolean;
  onAction: (a: TroubleshootAction) => void;
  onClose: () => void;
}

export function TroubleshootScreen({ isNfcSupported, onAction, onClose }: TroubleshootProps) {
  const t = useT();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<TroubleshootIssue | null>(null);
  const selectedLabel = TROUBLESHOOT_ISSUES.find((i) => i.issue === selected)?.label;

  // The whole content column scrolls and the issue list is a plain column. A nested scroller
  // would claim the remaining height and hide the actions panel on small screens.
  return (
    <Screen>
      <CloseRow><CloseButton onPress={onClose} accessibilityLabel={t('troubleshoot_close_content_description')} testID="troubleshoot-close" /></CloseRow>
      <ScrollBody contentStyle={{ paddingBottom: 24 }}>
        <AppText variant="headlineSmall" style={{ paddingTop: 12 }} accessibilityRole="header">{t('troubleshoot_title')}</AppText>
        <AppText variant="bodySmall" color={colors.onSurfaceVariant} style={{ paddingTop: 4, paddingBottom: 12 }}>{t('troubleshoot_subtitle')}</AppText>
        <View style={{ gap: 8, paddingVertical: 4 }}>
          {TROUBLESHOOT_ISSUES.map(({ issue, label }) => (
            <Pressable key={issue} onPress={() => setSelected(issue)} accessibilityRole="button" accessibilityState={{ selected: issue === selected }} accessibilityLabel={t(label)} testID={`issue-${issue}`}
              style={[styles.issueRow, { backgroundColor: issue === selected ? colors.secondaryContainer : colors.surface }]}>
              <AppText variant="bodyMedium" style={{ flexShrink: 1 }}>{t(label)}</AppText>
              <AppText variant="bodyMedium" color={colors.onSurfaceVariant}>›</AppText>
            </Pressable>
          ))}
        </View>
        {selected && selectedLabel ? (
          <View style={[styles.actions, { backgroundColor: colors.surfaceVariant }]} testID="troubleshoot-actions">
            <AppText variant="labelSmall" color={colors.onSurfaceVariant}>{`${t('troubleshoot_selected_prefix')} ${t(selectedLabel)}`}</AppText>
            {actionsFor(selected, isNfcSupported).map((a) => (
              <Pressable key={a} onPress={() => onAction(a)} accessibilityRole="button" accessibilityLabel={t(ACTION_LABELS[a])} testID={`action-${a}`}
                style={[styles.actionRow, { backgroundColor: colors.surface }]}>
                <AppText variant="bodyMedium" color={colors.primary}>{t(ACTION_LABELS[a])}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollBody>
    </Screen>
  );
}

const FAQS: ReadonlyArray<{ q: AppStringKey; a: AppStringKey }> = [
  { q: 'education_faq_antenna_location', a: 'education_faq_antenna_location_answer' },
  { q: 'education_faq_tap_tag', a: 'education_faq_tap_tag_answer' },
  { q: 'education_faq_pay_vs_scan', a: 'education_faq_pay_vs_scan_answer' },
  { q: 'education_faq_why_fail', a: 'education_faq_why_fail_answer' },
];

export function EducationScreen({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { colors } = useTheme();
  return (
    <Screen>
      <CloseRow><CloseButton onPress={onClose} accessibilityLabel={t('education_close_content_description')} testID="education-close" /></CloseRow>
      <ScrollBody contentStyle={{ gap: 10, paddingBottom: 24 }}>
        <AppText variant="headlineSmall" style={{ paddingTop: 12, paddingBottom: 2 }} accessibilityRole="header">{t('education_title')}</AppText>
        <View style={[styles.faq, { backgroundColor: colors.surfaceVariant }]}>
          <AppText variant="titleSmall">{t('education_what_is_nfc_title')}</AppText>
          <AppText variant="bodySmall" color={colors.onSurfaceVariant} style={{ marginTop: 6 }}>{t('education_what_is_nfc_body')}</AppText>
        </View>
        {FAQS.map((f) => <FaqRow key={f.q} q={t(f.q)} a={t(f.a)} />)}
      </ScrollBody>
    </Screen>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={q} style={[styles.faq, { backgroundColor: colors.surface }]}>
      <View style={styles.faqHead}>
        <AppText variant="bodyMedium" style={{ flexShrink: 1 }}>{q}</AppText>
        <AppText variant="bodyMedium" color={colors.onSurfaceVariant}>{expanded ? '−' : '+'}</AppText>
      </View>
      {expanded ? <AppText variant="bodySmall" color={colors.onSurfaceVariant} style={{ marginTop: 8 }}>{a}</AppText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  issueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 16, minHeight: MIN_TOUCH },
  actions: { borderRadius: 18, padding: 16, marginTop: 14, marginBottom: 24 },
  actionRow: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8, minHeight: MIN_TOUCH, justifyContent: 'center' },
  faq: { borderRadius: 16, padding: 16 },
  faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
