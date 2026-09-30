import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NfcLocatorLocaleProvider } from 'react-native-nfc-locator';
import { createAppEnvironment } from './AppEnvironment';
import { ErrorBoundary } from './ErrorBoundary';
import { I18nProvider, useI18n } from './i18n';
import { AppNavigator } from './navigation/AppNavigator';
import { EnvironmentProvider, useSettings } from './state/context';
import { ThemeProvider, useTheme } from './theme/theme';

export default function App() {
  const env = useMemo(() => createAppEnvironment(), []);
  return (
    <SafeAreaProvider>
      <EnvironmentProvider env={env}>
        <I18nProvider>
          <ErrorBoundary>
            <Shell />
          </ErrorBoundary>
        </I18nProvider>
      </EnvironmentProvider>
    </SafeAreaProvider>
  );
}

/** Applies the two settings that live above navigation: theme mode and (via components) reduced motion. */
function Shell() {
  const { settings } = useSettings();
  const { locale } = useI18n();
  return (
    <ThemeProvider mode={settings.appearanceMode}>
      <NfcLocatorLocaleProvider locale={locale}>
        <ThemedContent />
      </NfcLocatorLocaleProvider>
    </ThemeProvider>
  );
}

function ThemedContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </>
  );
}
