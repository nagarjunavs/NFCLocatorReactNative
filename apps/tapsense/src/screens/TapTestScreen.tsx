import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { TapTestMachine, type TapTestState } from '../nfc/TapTestMachine';
import { requestInAppReviewSafely } from '../util/inAppReview';
import { performSuccessHaptic } from '../util/launchers';
import { useEnv, useSettings } from '../state/context';
import { useActiveAntenna, useNfcState } from '../state/hooks';
import { Palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { AntennaMarker, AppText, CloseButton, FilledButton, OutlinedButton, StatusIcon } from '../ui/components';
import { CheckCircleIcon, WarningIcon } from '../ui/Icons';
import { openNfcSettings } from './openNfcSettings';
import { CloseRow, Screen } from './Screen';

/** iOS rejects a Core NFC session started mid navigation-transition: wait past a standard push. */
export const IOS_READER_START_DELAY_MS = 500;

/**
 * The real "does this tap zone actually work" flow: registers as a live NFC reader for as long
 * as this screen is up (Android reader mode / Core NFC session), driven by {@link TapTestMachine}.
 */
export function TapTestScreen({ onCancel }: { onCancel: () => void }) {
  const t = useT();
  const env = useEnv();
  const { settings, store } = useSettings();
  const antenna = useActiveAntenna();
  const nfc = useNfcState();
  const [state, setState] = useState<TapTestState>('Ready');
  const hapticsEnabled = settings.hapticsEnabled;
  const hapticsRef = React.useRef(hapticsEnabled);
  hapticsRef.current = hapticsEnabled;

  const machine = useMemo(() => {
    const reader = env.createTapReader();
    return new TapTestMachine({
      reader: reader ?? { start: async () => false, stop: () => {} },
      isNfcSupported: reader != null && nfc.isSupported,
      recordSuccess: () => store.recordTapTestSuccessAndCheckReviewEligibility(),
      // Fires at most once per install (see SettingsStore); the OS still applies its own quota.
      onReviewEligible: () => void requestInAppReviewSafely((m, e) => env.logger.w('InAppReview', m, e)),
      onHaptic: () => hapticsRef.current && performSuccessHaptic(),
      startDelayMs: Platform.OS === 'ios' ? IOS_READER_START_DELAY_MS : 0,
      // iOS has no NFC toggle: a refused start means the reader is unavailable, not "switched off".
      startFailureState: Platform.OS === 'ios' ? 'ReaderUnavailable' : 'NfcOff',
      onLog: (m, e) => env.logger.w('TapTest', m, e),
    });
    // The machine is created once per screen mount; NFC support is known before it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, nfc.ready]);

  useEffect(() => {
    if (!nfc.ready) return;
    const unsub = machine.subscribe(setState);
    machine.start();
    return () => {
      unsub();
      machine.dispose();
    };
  }, [machine, nfc.ready]);

  return (
    <Screen>
      <CloseRow><CloseButton onPress={onCancel} accessibilityLabel={t('tap_test_close_content_description')} testID="tap-test-close" /></CloseRow>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <AppText variant="headlineSmall" style={{ paddingTop: 4, paddingBottom: 8 }} accessibilityRole="header">{t('tap_test_title')}</AppText>
        <View style={styles.body} accessibilityLiveRegion="polite" testID={`tap-test-state-${state}`}>
          <Body state={state} antenna={antenna} />
        </View>
        <View style={{ paddingBottom: 24 }}>
          <Actions state={state} onCancel={onCancel} onRetry={() => machine.retry()} />
        </View>
      </View>
    </Screen>
  );
}

function Body({ state, antenna }: { state: TapTestState; antenna: ReturnType<typeof useActiveAntenna> }) {
  const t = useT();
  const theme = useTheme();
  const { colors } = theme;
  const title = (key: Parameters<typeof t>[0]) => <AppText variant="titleSmall" style={{ marginTop: 20, textAlign: 'center' }}>{t(key)}</AppText>;
  const hint = (key: Parameters<typeof t>[0]) => <AppText variant="bodySmall" color={colors.onSurfaceVariant} style={{ marginTop: 8, marginHorizontal: 32, textAlign: 'center' }}>{t(key)}</AppText>;
  switch (state) {
    case 'Ready':
    case 'Detecting':
      return (
        <>
          {antenna.uiState.kind !== 'loading' && antenna.uiState.kind !== 'error' ? (
            <AntennaMarker state={antenna.uiState} reducedMotion={antenna.reduceMotion} style={{ width: 147, height: 320, flex: 0 }}
              theme={theme.darkMockupLocatorTheme} silhouetteColor={theme.phoneBody} silhouetteBorderColor={theme.phoneBodyBorder} showCameraBump cameraBumpColor={theme.cameraBumpAccent} />
          ) : (
            <ActivityIndicator color={colors.primary} size="large" />
          )}
          {title('tap_test_state_detecting')}
          {hint('tap_test_hint_detecting')}
        </>
      );
    case 'Detected':
      return (<><StatusIcon background={colors.primaryContainer}><CheckCircleIcon size={40} color={Palette.Success} /></StatusIcon>{title('tap_test_state_detected')}{hint('tap_test_hint_detected')}</>);
    case 'TimedOut':
      return (<><StatusIcon background={colors.tertiaryContainer}><WarningIcon size={40} color={colors.onTertiaryContainer} /></StatusIcon>{title('tap_test_state_timed_out')}{hint('tap_test_hint_timed_out')}</>);
    case 'NfcOff':
      return (<><StatusIcon background={colors.errorContainer}><WarningIcon size={40} color={colors.error} /></StatusIcon>{title('tap_test_state_nfc_off')}{hint('tap_test_hint_nfc_off')}</>);
    case 'ReaderUnavailable':
      return (<><StatusIcon background={colors.errorContainer}><WarningIcon size={40} color={colors.error} /></StatusIcon>{title('tap_test_state_reader_unavailable')}{hint('tap_test_hint_reader_unavailable')}</>);
    case 'NfcUnsupported':
      return (<><StatusIcon background={colors.surfaceVariant}><WarningIcon size={40} color={colors.onSurfaceVariant} /></StatusIcon>{title('tap_test_state_nfc_unsupported')}{hint('tap_test_hint_nfc_unsupported')}</>);
  }
}

function Actions({ state, onCancel, onRetry }: { state: TapTestState; onCancel: () => void; onRetry: () => void }) {
  const t = useT();
  switch (state) {
    case 'Ready':
    case 'Detecting':
    case 'NfcUnsupported':
      return <OutlinedButton emphasis label={t('tap_test_cancel')} onPress={onCancel} testID="tap-test-cancel" />;
    case 'Detected':
      return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <OutlinedButton label={t('tap_test_tap_again')} onPress={onRetry} style={{ flex: 1 }} testID="tap-test-tap-again" />
          <FilledButton label={t('tap_test_cancel')} onPress={onCancel} style={{ flex: 1 }} />
        </View>
      );
    case 'TimedOut':
    case 'ReaderUnavailable':
      return <FilledButton label={t('tap_test_try_again')} onPress={onRetry} testID="tap-test-try-again" />;
    case 'NfcOff':
      return (
        <>
          <FilledButton label={t('tap_test_open_settings')} onPress={() => void openNfcSettings()} />
          <OutlinedButton label={t('tap_test_try_again')} onPress={onRetry} style={{ marginTop: 8 }} testID="tap-test-try-again" />
        </>
      );
  }
}

const styles = StyleSheet.create({ body: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' } });
