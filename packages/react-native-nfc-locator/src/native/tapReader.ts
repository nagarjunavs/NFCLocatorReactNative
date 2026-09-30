import type { NativeNfcLocatorModule } from './platform';

export interface TapSessionEnd {
  /** True if the session genuinely ran; false means it never started (entitlement problem). */
  becameActive: boolean;
  code: string;
  message: string;
}

/**
 * The seam the tap-test state machine depends on, so it is testable without NFC hardware.
 * `start` resolves false when no session could be started (no NFC, NFC off, OEM failure).
 */
export interface TapReaderController {
  start(onTagDetected: () => void, onSessionEnded: (end: TapSessionEnd) => void): Promise<boolean>;
  stop(): void;
}

/**
 * Real reader-mode controller over the native module. Session ids let stale native callbacks
 * be ignored by identity, never by a shared flag: `retry()` may install a NEW session before
 * the OLD one's late `sessionEnded` arrives.
 */
export function createNativeTapReader(native: NativeNfcLocatorModule): TapReaderController {
  let subs: Array<{ remove(): void }> = [];
  let currentId = 0;
  // Native events can arrive before the start() promise resolves with the session id; while
  // arming, the only live session is the one being started (older ones are silenced natively).
  let arming = false;

  const cleanup = () => {
    subs.forEach((s) => s.remove());
    subs = [];
  };
  const isCurrent = (id: number) => (arming ? true : id === currentId && currentId !== 0);

  return {
    async start(onTagDetected, onSessionEnded) {
      cleanup();
      currentId = 0;
      arming = true;
      subs = [
        native.onTagDiscovered((e) => {
          if (isCurrent(e.sessionId)) onTagDetected();
        }),
        native.onTapSessionEnded((e) => {
          if (!isCurrent(e.sessionId)) return; // stale callback for a replaced session
          currentId = 0;
          arming = false;
          onSessionEnded({ becameActive: e.becameActive, code: e.code, message: e.message });
        }),
      ];
      const id = await native.startTapSession();
      if (!arming) return id > 0; // the session already ended (or stop() ran) while arming
      arming = false;
      if (id <= 0) {
        cleanup();
        return false;
      }
      currentId = id;
      return true;
    },
    stop() {
      currentId = 0;
      arming = false;
      cleanup();
      native.stopTapSession();
    },
  };
}
