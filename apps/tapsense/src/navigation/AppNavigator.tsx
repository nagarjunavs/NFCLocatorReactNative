import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CommonActions, NavigationContainer, createNavigationContainerRef, type NavigationState, type PartialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/theme';
import { useNfcState } from '../state/hooks';
import { EducationScreen, TroubleshootScreen, type TroubleshootAction } from '../screens/HelpScreens';
import { HomeScreen } from '../screens/HomeScreen';
import { MyPhoneScreen } from '../screens/MyPhoneScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PhoneConfirmedScreen, PhoneSelectionScreen } from '../screens/PhoneScreens';
import { SettingsScreen, APP_VERSION } from '../screens/SettingsScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { TapGuideScreen } from '../screens/TapGuideScreen';
import { TapTestScreen } from '../screens/TapTestScreen';
import { openNfcSettings } from '../screens/openNfcSettings';
import { notifyUnavailable, openStoreListingSafely, openUrlSafely, sendFeedbackEmailSafely, PRIVACY_POLICY_URL } from '../util/launchers';
import { useT } from '../i18n';
import { BOTTOM_BAR_ROUTES, BottomBar } from './BottomBar';
import type { RootStackParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const routeName = (state: NavigationState | PartialState<NavigationState> | undefined): string | undefined =>
  state?.routes[state.index ?? state.routes.length - 1]?.name;

/**
 * One flat stack with a bottom bar shown/hidden per current route (no nested per-tab stacks).
 * Switching tabs clears the path and swaps the root, so tab switches don't preserve each tab's
 * own navigation state: a minor simplification that has no functional effect.
 *
 * Default native back chrome is kept (with an empty title) rather than hiding the header:
 * hiding the navigation bar on iOS also disables the interactive swipe-back gesture.
 */
export function AppNavigator() {
  const t = useT();
  const { colors } = useTheme();
  const nfc = useNfcState();
  const [current, setCurrent] = useState<string | undefined>(undefined);
  const showBar = current !== undefined && BOTTOM_BAR_ROUTES.includes(current);

  const nav = navigationRef;
  const goTopLevel = useCallback((name: 'Home' | 'MyPhone' | 'Settings') => {
    nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
  }, [nav]);
  const replaceWith = useCallback((name: keyof RootStackParamList) => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] })), [nav]);

  const onTroubleshootAction = (a: TroubleshootAction) => {
    switch (a) {
      case 'OPEN_NFC_SETTINGS': void openNfcSettings(); break;
      case 'RUN_TAP_TEST': nav.navigate('TapTest'); break;
      case 'VIEW_TAP_ZONE': goTopLevel('MyPhone'); break;
      case 'CHOOSE_PHONE': nav.navigate('PhoneSelection'); break;
      case 'LEARN_MORE': nav.navigate('Education'); break;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <NavigationContainer
        ref={nav}
        onStateChange={(s) => setCurrent(routeName(s))}
        onReady={() => setCurrent(nav.getCurrentRoute()?.name)}
      >
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'default' }}>
          <Stack.Screen name="Splash">
            {() => <SplashScreen onNavigate={(d) => replaceWith(d)} />}
          </Stack.Screen>
          <Stack.Screen name="Onboarding" options={{ gestureEnabled: false }}>
            {() => (
              <OnboardingScreen
                onDone={() => replaceWith('Home')}
                onStartGuidedWalkthrough={() => nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'TapGuide' }] }))}
                onChooseDifferentPhone={() => nav.navigate('PhoneSelection')}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Home" options={{ gestureEnabled: false }}>
            {() => <HomeScreen onStartTapGuide={() => nav.navigate('TapGuide')} onChangePhone={() => nav.navigate('PhoneSelection')} onTapNotWorking={() => nav.navigate('Troubleshoot')} />}
          </Stack.Screen>
          <Stack.Screen name="MyPhone" options={{ gestureEnabled: false }}>
            {() => <MyPhoneScreen onTestLocation={() => nav.navigate('TapTest')} />}
          </Stack.Screen>
          <Stack.Screen name="Settings" options={{ gestureEnabled: false }}>
            {() => (
              <SettingsScreen
                versionName={APP_VERSION}
                onPhoneModelClick={() => nav.navigate('PhoneSelection')}
                onHelpCenterClick={() => nav.navigate('Troubleshoot')}
                onContactSupportClick={() => void sendFeedbackEmailSafely(APP_VERSION)}
                onRateAppClick={async () => { if (!(await openStoreListingSafely())) notifyUnavailable(t('settings_rate_app'), 'The store listing is not available yet.'); }}
                onPrivacyClick={() => void openUrlSafely(PRIVACY_POLICY_URL)}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="PhoneSelection">
            {() => (
              <PhoneSelectionScreen
                onPhoneSelected={() => replaceWith('PhoneConfirmed')}
                onUseMyPhone={() => (nav.canGoBack() ? nav.goBack() : replaceWith('Home'))}
                onClose={() => (nav.canGoBack() ? nav.goBack() : replaceWith('Home'))}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="PhoneConfirmed">
            {() => <PhoneConfirmedScreen onGoHome={() => goTopLevel('Home')} onChooseDifferent={() => replaceWith('PhoneSelection')} />}
          </Stack.Screen>
          <Stack.Screen name="TapGuide" options={{ animation: 'slide_from_bottom' }}>
            {() => (
              <TapGuideScreen
                onRunTapTest={() => nav.navigate('TapTest')}
                onClose={() => (nav.canGoBack() ? nav.goBack() : replaceWith('Home'))}
                onNfcUnsupported={() => nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'TapTest' }] }))}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="TapTest">
            {() => <TapTestScreen onCancel={() => (nav.canGoBack() ? nav.goBack() : replaceWith('Home'))} />}
          </Stack.Screen>
          <Stack.Screen name="Troubleshoot">
            {() => <TroubleshootScreen isNfcSupported={nfc.isSupported} onAction={onTroubleshootAction} onClose={() => (nav.canGoBack() ? nav.goBack() : replaceWith('Home'))} />}
          </Stack.Screen>
          <Stack.Screen name="Education">
            {() => <EducationScreen onClose={() => (nav.canGoBack() ? nav.goBack() : replaceWith('Home'))} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      {showBar ? (
        <BottomBar currentRoute={current} onHome={() => goTopLevel('Home')} onMyPhone={() => goTopLevel('MyPhone')} onTapGuide={() => nav.navigate('TapGuide')} onSettings={() => goTopLevel('Settings')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
