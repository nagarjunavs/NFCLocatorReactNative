import { Alert, Linking, Platform, Vibration } from 'react-native';

/** The app's privacy policy, hosted outside the app so it can be updated without a release. */
export const PRIVACY_POLICY_URL = 'https://nagarjunavs.github.io/tapsense/android/privacy/';
/** Support inbox: the only feedback channel the app offers. */
export const SUPPORT_EMAIL = 'nagarjunavs.dev@gmail.com';
/** The published package/bundle id (not a debug variant's), so "Rate" always targets the real listing. */
export const STORE_PACKAGE_ID = 'com.tapsense.app';
/** Apple's numeric app id, filled in once the app has an App Store listing. */
export const APP_STORE_ID: string | null = null;

/** Opens a URL, or does nothing if no app can handle it. Never throws. */
export async function openUrlSafely(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens an editable mail draft addressed to support, subject pre-filled with the version.
 * Nothing is collected or sent by the app itself: it only hands a draft to the user's own mail
 * client, same as tapping a mailto: link.
 */
export function sendFeedbackEmailSafely(versionName: string): Promise<boolean> {
  const subject = encodeURIComponent(`TapSense feedback (${versionName})`);
  return openUrlSafely(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
}

/** Opens the store listing directly: always available, unlike the OS review prompt (quota-limited). */
export async function openStoreListingSafely(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    if (!APP_STORE_ID) return false;
    return openUrlSafely(`itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`);
  }
  // Prefer the market: URI (resolves straight into the Play Store app); fall back to the web listing.
  return (await openUrlSafely(`market://details?id=${STORE_PACKAGE_ID}`))
    || openUrlSafely(`https://play.google.com/store/apps/details?id=${STORE_PACKAGE_ID}`);
}

/** Short haptic confirmation for a detected tap. */
export function performSuccessHaptic(): void {
  try {
    Vibration.vibrate(Platform.OS === 'ios' ? undefined : 40);
  } catch {
    // Haptics are a nicety: never let them break the flow.
  }
}

/** Surfaces a non-blocking notice when an action has nothing to open (e.g. no App Store id yet). */
export function notifyUnavailable(title: string, message: string): void {
  Alert.alert(title, message);
}
