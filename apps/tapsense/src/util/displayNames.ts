/**
 * Raw model strings are lowercase, underscore/hyphen-separated codes ("sdk_gphone64_arm64",
 * "sm-a546b"). Capitalize after every space/underscore/hyphen; digit-led segments stay as-is
 * (no canonical casing exists for a bare SKU like "24031pn0dc" without a device dictionary).
 */
export function toDisplayDeviceName(raw: string): string {
  const spaced = raw.replace(/_/g, ' ');
  let out = '';
  let capitalizeNext = true;
  for (const ch of spaced) {
    if (capitalizeNext && /\p{L}/u.test(ch)) {
      out += ch.toUpperCase();
      capitalizeNext = false;
    } else {
      out += ch;
      if (ch === ' ' || ch === '-') capitalizeNext = true;
    }
  }
  return out;
}

/** Marketing names for the SKUs/model codes in seed_catalog.json, keyed by lowercase model. */
const FRIENDLY_MODEL_NAMES: Record<string, string> = {
  'sm-s918b': 'Galaxy S23 Ultra',
  'sm-s911b': 'Galaxy S23',
  'sm-a546b': 'Galaxy A54 5G',
  'sm-f946b': 'Galaxy Z Fold5',
  'sm-f731b': 'Galaxy Z Flip5',
  'sm-x610': 'Galaxy Tab S6 Lite',
  'sm-a556b': 'Galaxy A55 5G',
  'sm-s711b': 'Galaxy S23 FE',
  'pixel 8': 'Pixel 8',
  'pixel 8 pro': 'Pixel 8 Pro',
  'pixel 8a': 'Pixel 8a',
  'pixel 7': 'Pixel 7',
  'pixel 6a': 'Pixel 6a',
  'pixel fold': 'Pixel Fold',
  'pixel tablet': 'Pixel Tablet',
  'iphone12,1': 'iPhone 11',
  'iphone13,2': 'iPhone 12',
  'iphone14,5': 'iPhone 13',
  'iphone14,6': 'iPhone SE (3rd generation)',
  'iphone14,7': 'iPhone 14',
  'iphone15,2': 'iPhone 14 Pro',
  cph2581: 'OnePlus 12',
  '2312dra50g': 'Redmi Note 13 Pro+',
  '24031pn0dc': 'Xiaomi 14 Ultra',
  'moto g power': 'Moto G Power',
  'xq-ct72': 'Xperia 5 IV',
  'sm-s921b': 'Galaxy S24',
  'sm-s926b': 'Galaxy S24+',
  'sm-s928b': 'Galaxy S24 Ultra',
  'sm-f956b': 'Galaxy Z Fold6',
  'sm-f741b': 'Galaxy Z Flip6',
  'sm-x710': 'Galaxy Tab S9',
  'pixel 9': 'Pixel 9',
  'pixel 9 pro': 'Pixel 9 Pro',
  'pixel 9a': 'Pixel 9a',
  'iphone15,4': 'iPhone 15',
  'iphone16,1': 'iPhone 15 Pro',
  'iphone17,3': 'iPhone 16',
  'iphone17,1': 'iPhone 16 Pro',
  'iphone17,2': 'iPhone 16 Pro Max',
  cph2655: 'OnePlus 13',
  '23127pn0cg': 'Xiaomi 14',
  'razr 2024': 'Razr (2024)',
  'xq-ec72': 'Xperia 1 VI',
};

const FRIENDLY_MANUFACTURER_NAMES: Record<string, string> = {
  samsung: 'Samsung',
  google: 'Google',
  apple: 'Apple',
  oneplus: 'OnePlus',
  xiaomi: 'Xiaomi',
  motorola: 'Motorola',
  sony: 'Sony',
};

/** The device's marketing name ("Galaxy S23 Ultra"), not the raw SKU/model code. */
export const friendlyModelName = (model: string): string =>
  FRIENDLY_MODEL_NAMES[model.trim().toLowerCase()] ?? toDisplayDeviceName(model);

/** The manufacturer's proper display name ("Samsung"), not the raw lowercase code. */
export const friendlyManufacturerName = (manufacturer: string): string =>
  FRIENDLY_MANUFACTURER_NAMES[manufacturer.trim().toLowerCase()] ?? toDisplayDeviceName(manufacturer);

/** "Samsung Galaxy S23 Ultra": manufacturer + marketing name, for single-line display. */
export const friendlyDeviceName = (manufacturer: string, model: string): string =>
  `${friendlyManufacturerName(manufacturer)} ${friendlyModelName(model)}`;

/** First letter upper-cased, as the lists show raw manufacturer names. */
export const capitalizeFirst = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
