import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '../src/ErrorBoundary';
import { I18nProvider } from '../src/i18n';

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <Text>recovered</Text>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows a retry screen and recovers when the child stops throwing', async () => {
    await render(
      <I18nProvider>
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      </I18nProvider>,
    );
    expect(screen.getByTestId('error-boundary')).toBeTruthy();
    shouldThrow = false;
    await fireEvent.press(screen.getByTestId('error-boundary-retry'));
    expect(screen.getByText('recovered')).toBeTruthy();
  });
});
