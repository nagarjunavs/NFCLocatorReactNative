import type { TapReaderController, TapSessionEnd } from 'react-native-nfc-locator';

export type TapTestState =
  | 'NfcUnsupported'
  | 'NfcOff'
  | 'Ready'
  | 'Detecting'
  | 'Detected'
  | 'TimedOut'
  /** The reader session was rejected before it started (iOS: almost always entitlement/provisioning). */
  | 'ReaderUnavailable';

export const DEFAULT_TIMEOUT_MS = 25_000;

export interface TapTestDeps {
  reader: TapReaderController;
  isNfcSupported: boolean;
  /** Called once per successful tag detection; resolves true when the review flow should fire. */
  recordSuccess: () => Promise<boolean>;
  onReviewEligible: () => void;
  onHaptic: () => void;
  timeoutMs?: number;
  /** iOS rejects a session started mid navigation-transition; wait this long before arming. */
  startDelayMs?: number;
  /**
   * What "the reader couldn't be armed" means on this platform. Android: NFC is switched off
   * (reader mode needs an enabled adapter). iOS has no NFC toggle, so a refused start means
   * the reader is unavailable (hardware, or entitlement/provisioning), never "switched off".
   */
  startFailureState?: 'NfcOff' | 'ReaderUnavailable';
  onLog?: (message: string, error?: unknown) => void;
}

/**
 * The Tap Test state machine. Plain TypeScript behind the {@link TapReaderController} seam so
 * every transition is testable without NFC hardware. Reader mode is real (not a timer).
 *
 * `retry()` always re-arms the native session. Android's reader mode outlives the UI countdown,
 * but a Core NFC session ends on its own (sheet dismissed, ~60s OS timeout), so resetting only
 * the countdown would leave a retry listening to nothing on iOS. Re-arming is harmless on Android.
 */
export class TapTestMachine {
  private state: TapTestState = 'Ready';
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private startHandle: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private generation = 0;
  private readonly listeners = new Set<(s: TapTestState) => void>();

  constructor(private readonly deps: TapTestDeps) {}

  get current(): TapTestState {
    return this.state;
  }

  subscribe(l: (s: TapTestState) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private set(next: TapTestState) {
    if (this.disposed || this.state === next) return;
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }

  /** Call when the screen appears. */
  start(): void {
    if (!this.deps.isNfcSupported) {
      this.set('NfcUnsupported');
      return;
    }
    const delay = this.deps.startDelayMs ?? 0;
    if (delay <= 0) {
      void this.arm();
      return;
    }
    const gen = this.generation;
    this.startHandle = setTimeout(() => {
      this.startHandle = null;
      // Backing out before the delay elapses must not start a session on a screen that's gone.
      if (!this.disposed && gen === this.generation) void this.arm();
    }, delay);
  }

  private async arm(): Promise<void> {
    const gen = ++this.generation;
    let started = false;
    try {
      started = await this.deps.reader.start(
        () => this.onTagDetected(gen),
        (end) => this.onSessionEnded(gen, end),
      );
    } catch (e) {
      this.deps.onLog?.('reader.start threw', e);
    }
    if (this.disposed || gen !== this.generation) {
      if (started) this.deps.reader.stop();
      return;
    }
    if (this.state === 'Detected' || this.state === 'TimedOut' || this.state === 'ReaderUnavailable') return; // ended while arming
    if (!started) {
      this.set(this.deps.startFailureState ?? 'NfcOff');
      return;
    }
    this.beginDetecting();
  }

  private onTagDetected(gen: number) {
    if (this.disposed || gen !== this.generation) return;
    this.clearTimeout();
    this.set('Detected');
    this.deps.onHaptic();
    this.deps.recordSuccess().then(
      (eligible) => eligible && !this.disposed && this.deps.onReviewEligible(),
      (e) => this.deps.onLog?.('recordSuccess failed', e),
    );
  }

  private onSessionEnded(gen: number, end: TapSessionEnd) {
    if (this.disposed || gen !== this.generation) return;
    this.deps.onLog?.(`session ended (becameActive=${end.becameActive}, code=${end.code}): ${end.message}`);
    if (this.state === 'Detected') return; // a completed success stays completed
    this.clearTimeout();
    // "Ran but nothing was presented" vs "never started": different copy, different fix.
    this.set(end.becameActive ? 'TimedOut' : 'ReaderUnavailable');
  }

  private beginDetecting() {
    this.clearTimeout();
    this.set('Detecting');
    this.timeoutHandle = setTimeout(() => {
      if (this.state === 'Detecting') this.set('TimedOut');
    }, this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }

  /** "Try again" / "Tap again": genuinely re-arms the native session (see class doc). */
  retry(): void {
    if (this.disposed) return;
    this.clearTimeout();
    this.set('Ready');
    void this.arm();
  }

  private clearTimeout() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this.timeoutHandle = null;
  }

  /** Call when the screen is left. */
  dispose(): void {
    this.disposed = true;
    this.generation++;
    this.clearTimeout();
    if (this.startHandle) clearTimeout(this.startHandle);
    this.startHandle = null;
    this.deps.reader.stop();
    this.listeners.clear();
  }
}
