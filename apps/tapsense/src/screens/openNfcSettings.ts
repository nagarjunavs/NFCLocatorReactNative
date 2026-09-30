import { getNativeModule } from 'react-native-nfc-locator';

/** Opens the system NFC settings; a no-op when there is nothing to open (no NFC hardware, iOS). Never throws. */
export async function openNfcSettings(): Promise<boolean> {
  try {
    return (await getNativeModule()?.openNfcSettings()) ?? false;
  } catch {
    return false;
  }
}
