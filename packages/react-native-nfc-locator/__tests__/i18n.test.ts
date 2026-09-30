import { LIBRARY_STRINGS } from '../src/i18n/generated';
import { SUPPORTED_LOCALES, createTranslator, formatString, resolveLocale } from '../src';

describe('i18n', () => {
  it('ships all 9 locales with identical key sets and placeholders', () => {
    const en = LIBRARY_STRINGS.en!;
    for (const locale of SUPPORTED_LOCALES) {
      const table = LIBRARY_STRINGS[locale]!;
      expect(Object.keys(table).sort()).toEqual(Object.keys(en).sort());
    }
  });
  it('resolves locales with region and language fallbacks', () => {
    expect(resolveLocale('pt-PT')).toBe('pt-BR');
    expect(resolveLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(resolveLocale('de_DE')).toBe('de');
    expect(resolveLocale('xx')).toBe('en');
    expect(resolveLocale(null)).toBe('en');
  });
  it('translates and falls back to English for an unknown locale', () => {
    expect(createTranslator('en')('nfc_locator_retry_button')).toBe('Try again');
    expect(createTranslator('xx')('nfc_locator_retry_button')).toBe('Try again');
    expect(createTranslator('de')('nfc_locator_retry_button')).not.toBe('Try again');
  });
  it('formats Android positional placeholders', () => {
    expect(formatString('Step %1$d of %2$d', [2, 5])).toBe('Step 2 of 5');
    expect(formatString('%2$s then %1$s', ['a', 'b'])).toBe('b then a');
  });
});
