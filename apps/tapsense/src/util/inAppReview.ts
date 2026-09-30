import InAppReview from 'react-native-in-app-review';

/**
 * Fires the OS in-app review flow. Fire-and-forget by design, per platform guidance: the API
 * never reveals whether a dialog was shown or whether the user reviewed (it applies its own
 * undisclosed quota), and a failed request must never change the app's normal flow. This only
 * decides *when to ask*; call-site gating (see SettingsStore) keeps it to once per install.
 * Only ever succeeds for a build installed through the store (Play track / TestFlight / App Store).
 */
export async function requestInAppReviewSafely(log?: (m: string, e?: unknown) => void): Promise<void> {
  try {
    if (!InAppReview.isAvailable()) {
      log?.('in-app review not available on this device/build');
      return;
    }
    await InAppReview.RequestInAppReview();
  } catch (e) {
    log?.('requestInAppReview failed (expected for non-store installs)', e);
  }
}
