import React, { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator } from 'react-native-nfc-locator';
import { useI18n } from './i18n';

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

/** Keeps a render error from blanking the whole app: shows a retry screen instead. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[TapSense] render error', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <Fallback onRetry={() => this.setState({ failed: false })} />;
  }
}

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { locale } = useI18n();
  const t = createTranslator(locale);
  return (
    <View style={styles.container} accessibilityRole="alert" testID="error-boundary">
      <Text style={styles.title} accessibilityRole="header">{t('nfc_locator_error_title')}</Text>
      <Text style={styles.body}>{t('nfc_locator_error_body')}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" style={styles.button} testID="error-boundary-retry">
        <Text style={styles.buttonText}>{t('nfc_locator_retry_button')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#F6F4F0' },
  title: { fontSize: 20, fontWeight: '700', color: '#211F1C' },
  body: { fontSize: 14, textAlign: 'center', color: '#5C5850' },
  button: { minHeight: 48, paddingHorizontal: 24, borderRadius: 24, backgroundColor: '#211F1C', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
