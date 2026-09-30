import { LIBRARY_STRINGS } from './generated';
import type { StringKey } from './keys';

export type { StringKey } from './keys';
export const SUPPORTED_LOCALES = ['en', 'es', 'pt-BR', 'fr', 'de', 'hi', 'ja', 'ko', 'zh-CN'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Picks the best supported locale for a BCP-47 tag: exact match, else same language
 * (`pt-PT` -> `pt-BR`, `zh-Hans-CN` -> `zh-CN`), else English.
 */
export function resolveLocale(tag: string | null | undefined): Locale {
  if (!tag) return 'en';
  const norm = tag.replace('_', '-');
  const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === norm.toLowerCase());
  if (exact) return exact;
  const lang = norm.split('-')[0]!.toLowerCase();
  return SUPPORTED_LOCALES.find((l) => l.toLowerCase().split('-')[0] === lang) ?? 'en';
}

/** Replaces Android-style positional placeholders (`%1$s`, `%2$d`). */
export function formatString(template: string, args: ReadonlyArray<string | number> = []): string {
  return template.replace(/%(\d+)\$[sd]/g, (m, n: string) => {
    const v = args[Number(n) - 1];
    return v === undefined ? m : String(v);
  });
}

export type Translator = (key: StringKey, ...args: Array<string | number>) => string;

/** Creates a translator for a locale, falling back to English then the key itself. */
export function createTranslator(locale: Locale | string | null | undefined): Translator {
  const resolved = resolveLocale(locale);
  const table = LIBRARY_STRINGS[resolved] ?? {};
  const en = LIBRARY_STRINGS.en ?? {};
  return (key, ...args) => formatString(table[key] ?? en[key] ?? key, args);
}
