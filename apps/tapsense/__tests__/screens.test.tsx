import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { toDomainOrNull, type CatalogEntryDto } from 'react-native-nfc-locator';
import { I18nProvider, createT } from '../src/i18n';
import { ThemeProvider } from '../src/theme/theme';
import { EducationScreen, TROUBLESHOOT_ISSUES, TroubleshootScreen, actionsFor } from '../src/screens/HelpScreens';
import { filterPhones } from '../src/screens/PhoneScreens';
import { TAP_GUIDE_STEPS } from '../src/screens/TapGuideScreen';
import { BOTTOM_BAR_ROUTES } from '../src/navigation/BottomBar';
import { greetingKey } from '../src/state/hooks';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const wrap = (node: React.ReactElement, locale = 'en') => (
  <SafeAreaProvider initialMetrics={metrics}>
    <I18nProvider override={locale}>
      <ThemeProvider mode="LIGHT">{node}</ThemeProvider>
    </I18nProvider>
  </SafeAreaProvider>
);

describe('Troubleshoot', () => {
  it('offers contextual actions per issue', () => {
    expect(actionsFor('NO_REACTION', true)).toEqual(['OPEN_NFC_SETTINGS', 'RUN_TAP_TEST']);
    expect(actionsFor('READER_SILENT', true)).toEqual(['OPEN_NFC_SETTINGS', 'RUN_TAP_TEST']);
    expect(actionsFor('PAY_FAILING', true)).toEqual(['OPEN_NFC_SETTINGS', 'RUN_TAP_TEST']);
    expect(actionsFor('CANNOT_SCAN', true)).toEqual(['RUN_TAP_TEST', 'VIEW_TAP_ZONE']);
    expect(actionsFor('DONT_KNOW_WHERE', true)).toEqual(['VIEW_TAP_ZONE', 'LEARN_MORE']);
    expect(actionsFor('MODEL_MISSING', true)).toEqual(['CHOOSE_PHONE']);
  });

  it('never offers "Open NFC settings" on a device with no NFC hardware', () => {
    for (const { issue } of TROUBLESHOOT_ISSUES) expect(actionsFor(issue, false)).not.toContain('OPEN_NFC_SETTINGS');
  });

  it('lists all six issues; selecting one reveals its actions and tapping an action reports it', async () => {
    const onAction = jest.fn();
    await render(wrap(<TroubleshootScreen isNfcSupported onAction={onAction} onClose={jest.fn()} />));
    expect(TROUBLESHOOT_ISSUES).toHaveLength(6);
    expect(screen.queryByTestId('troubleshoot-actions')).toBeNull();
    await fireEvent.press(screen.getByTestId('issue-CANNOT_SCAN'));
    expect(screen.getByText(/Selected: I can.t scan a tag/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('action-VIEW_TAP_ZONE'));
    expect(onAction).toHaveBeenCalledWith('VIEW_TAP_ZONE');
  });

  it('the close button meets the 48dp minimum touch target', async () => {
    await render(wrap(<TroubleshootScreen isNfcSupported onAction={jest.fn()} onClose={jest.fn()} />));
    const style = Object.assign({}, ...[screen.getByTestId('troubleshoot-close').props.style].flat(Infinity).filter(Boolean));
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  });
});

describe('Education', () => {
  it('expands and collapses an FAQ answer', async () => {
    await render(wrap(<EducationScreen onClose={jest.fn()} />));
    expect(screen.queryByText(/Usually near the upper back/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Where is the antenna on my phone?'));
    expect(screen.getByText(/Usually near the upper back/)).toBeTruthy();
  });
  it('renders in another locale', async () => {
    await render(wrap(<EducationScreen onClose={jest.fn()} />, 'de'));
    expect(screen.queryByText('NFC basics')).toBeNull();
  });
});

describe('phone filter', () => {
  const dto = (manufacturer: string, model: string): CatalogEntryDto => ({ manufacturer, model, formFactor: 'BAR', silhouetteTemplateId: 'silhouette_bar', zoneX: 0.3, zoneY: 0.2, zoneWidth: 0.4, zoneHeight: 0.14, catalogVersion: 1 });
  const all = [dto('google', 'pixel 8'), dto('apple', 'iphone15,4'), dto('samsung', 'sm-s918b')].map((d) => toDomainOrNull(d, 'SEED_CATALOG')!);
  it('partitions Android vs Apple and applies the search on top', () => {
    expect(filterPhones(all, 'ANDROID', '').map((p) => p.manufacturer)).toEqual(['google', 'samsung']);
    expect(filterPhones(all, 'APPLE', '').map((p) => p.manufacturer)).toEqual(['apple']);
    expect(filterPhones(all, 'ANDROID', 'galaxy')).toHaveLength(1);
    expect(filterPhones(all, 'APPLE', 'galaxy')).toHaveLength(0);
  });
});

describe('constants', () => {
  it('greeting boundaries: morning 5-11, afternoon 12-17, otherwise evening', () => {
    expect([4, 5, 11, 12, 17, 18, 23, 0].map(greetingKey)).toEqual([
      'home_greeting_evening', 'home_greeting_morning', 'home_greeting_morning', 'home_greeting_afternoon',
      'home_greeting_afternoon', 'home_greeting_evening', 'home_greeting_evening', 'home_greeting_evening',
    ]);
  });
  it('the bottom bar shows on exactly Home / MyPhone / Settings', () => {
    expect([...BOTTOM_BAR_ROUTES]).toEqual(['Home', 'MyPhone', 'Settings']);
  });
  it('the tap guide has five steps, each with a translated title and body in every locale', () => {
    expect(TAP_GUIDE_STEPS).toHaveLength(5);
    for (const locale of ['en', 'es', 'pt-BR', 'fr', 'de', 'hi', 'ja', 'ko', 'zh-CN']) {
      const t = createT(locale);
      for (const s of TAP_GUIDE_STEPS) {
        expect(t(s.title)).not.toBe(s.title);
        expect(t(s.body)).not.toBe(s.body);
      }
    }
  });
  it('the iOS-only reader-unavailable strings exist (English fallback in every locale)', () => {
    expect(createT('ja')('tap_test_state_reader_unavailable')).toBe("Couldn't start the NFC reader");
  });
});
