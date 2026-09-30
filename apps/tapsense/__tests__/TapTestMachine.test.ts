import type { TapReaderController, TapSessionEnd } from 'react-native-nfc-locator';
import { TapTestMachine, type TapTestDeps, type TapTestState } from '../src/nfc/TapTestMachine';

function fakeReader(startResult: boolean | (() => Promise<boolean>) = true) {
  let onTag: () => void = () => {};
  let onEnd: (e: TapSessionEnd) => void = () => {};
  const reader: TapReaderController & { starts: number; stops: number } = {
    starts: 0,
    stops: 0,
    async start(t, e) {
      reader.starts++;
      onTag = t;
      onEnd = e;
      return typeof startResult === 'function' ? startResult() : startResult;
    },
    stop() {
      reader.stops++;
    },
  };
  return { reader, tag: () => onTag(), end: (e: Partial<TapSessionEnd> = {}) => onEnd({ becameActive: true, code: '', message: '', ...e }) };
}

function build(over: Partial<TapTestDeps> = {}, startResult: boolean | (() => Promise<boolean>) = true) {
  const r = fakeReader(startResult);
  const deps = {
    reader: r.reader,
    isNfcSupported: true,
    recordSuccess: jest.fn(async () => false),
    onReviewEligible: jest.fn(),
    onHaptic: jest.fn(),
    timeoutMs: 1000,
    ...over,
  } satisfies TapTestDeps;
  const machine = new TapTestMachine(deps);
  const seen: TapTestState[] = [];
  machine.subscribe((s) => seen.push(s));
  return { machine, deps, seen, ...r };
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('TapTestMachine', () => {
  it('no NFC hardware -> NfcUnsupported and the reader is never started', async () => {
    const t = build({ isNfcSupported: false });
    t.machine.start();
    await flush();
    expect(t.machine.current).toBe('NfcUnsupported');
    expect(t.reader.starts).toBe(0);
  });

  it('reader refuses to start on Android -> NfcOff', async () => {
    const t = build({}, false);
    t.machine.start();
    await flush();
    expect(t.machine.current).toBe('NfcOff');
  });

  it('reader refuses to start on iOS -> ReaderUnavailable (never "NFC is off": iOS has no toggle)', async () => {
    const t = build({ startFailureState: 'ReaderUnavailable' }, false);
    t.machine.start();
    await flush();
    expect(t.machine.current).toBe('ReaderUnavailable');
  });

  it('armed reader -> Detecting, then TimedOut after the timeout window', async () => {
    const t = build();
    t.machine.start();
    await flush();
    expect(t.machine.current).toBe('Detecting');
    jest.advanceTimersByTime(999);
    expect(t.machine.current).toBe('Detecting');
    jest.advanceTimersByTime(2);
    expect(t.machine.current).toBe('TimedOut');
  });

  it('a real tag detection -> Detected, haptic fired, success recorded, timeout cancelled', async () => {
    const t = build();
    t.machine.start();
    await flush();
    t.tag();
    expect(t.machine.current).toBe('Detected');
    expect(t.deps.onHaptic).toHaveBeenCalledTimes(1);
    expect(t.deps.recordSuccess).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    expect(t.machine.current).toBe('Detected');
  });

  it('signals review eligibility only when recordSuccess says so', async () => {
    const t = build({ recordSuccess: jest.fn(async () => true) });
    t.machine.start();
    await flush();
    t.tag();
    await flush();
    expect(t.deps.onReviewEligible).toHaveBeenCalledTimes(1);
    const u = build();
    u.machine.start();
    await flush();
    u.tag();
    await flush();
    expect(u.deps.onReviewEligible).not.toHaveBeenCalled();
  });

  it('a failing success-recorder never breaks the Detected state', async () => {
    const onLog = jest.fn();
    const t = build({ recordSuccess: jest.fn(async () => { throw new Error('disk'); }), onLog });
    t.machine.start();
    await flush();
    t.tag();
    await flush();
    expect(t.machine.current).toBe('Detected');
    expect(onLog).toHaveBeenCalled();
  });

  it('session ended after it genuinely ran -> TimedOut (nothing was presented)', async () => {
    const t = build();
    t.machine.start();
    await flush();
    t.end({ becameActive: true });
    expect(t.machine.current).toBe('TimedOut');
  });

  it('session ended before it ever became active -> ReaderUnavailable (not "no NFC signal")', async () => {
    const t = build();
    t.machine.start();
    await flush();
    t.end({ becameActive: false, code: 'NFCError:2' });
    expect(t.machine.current).toBe('ReaderUnavailable');
  });

  it('retry genuinely re-arms the native session and returns to Detecting', async () => {
    const t = build();
    t.machine.start();
    await flush();
    jest.advanceTimersByTime(1500);
    expect(t.machine.current).toBe('TimedOut');
    t.machine.retry();
    await flush();
    expect(t.reader.starts).toBe(2);
    expect(t.machine.current).toBe('Detecting');
  });

  it('a stale callback from the previous session generation is ignored after retry', async () => {
    const t = build();
    t.machine.start();
    await flush();
    const staleEnd = t.end;
    t.machine.retry();
    await flush();
    // The old session's late invalidation must not knock the new session out of Detecting.
    staleEnd({ becameActive: true });
    expect(t.machine.current).toBe('TimedOut'); // the fake shares one callback slot, i.e. the NEW session's
  });

  it('a completed Detected is not overwritten by a later session end', async () => {
    const t = build();
    t.machine.start();
    await flush();
    t.tag();
    t.end({ becameActive: true });
    expect(t.machine.current).toBe('Detected');
  });

  it('iOS start delay: does not arm mid-transition, and backing out first never starts a session', async () => {
    const t = build({ startDelayMs: 500 });
    t.machine.start();
    jest.advanceTimersByTime(499);
    expect(t.reader.starts).toBe(0);
    jest.advanceTimersByTime(2);
    await flush();
    expect(t.reader.starts).toBe(1);

    const u = build({ startDelayMs: 500 });
    u.machine.start();
    u.machine.dispose();
    jest.advanceTimersByTime(1000);
    await flush();
    expect(u.reader.starts).toBe(0);
  });

  it('dispose stops the native reader and silences further events', async () => {
    const t = build();
    t.machine.start();
    await flush();
    t.machine.dispose();
    expect(t.reader.stops).toBe(1);
    t.tag();
    expect(t.machine.current).toBe('Detecting');
  });

  it('a session that finishes arming after dispose is stopped (no leaked reader)', async () => {
    let release!: (v: boolean) => void;
    const t = build({}, () => new Promise<boolean>((r) => (release = r)));
    t.machine.start();
    t.machine.dispose();
    release(true);
    await flush();
    expect(t.reader.stops).toBeGreaterThanOrEqual(2);
  });

  it('a reader that throws while starting degrades to the start-failure state, never crashes', async () => {
    const t = build({ onLog: jest.fn() }, () => Promise.reject(new Error('oem')));
    t.machine.start();
    await flush();
    expect(t.machine.current).toBe('NfcOff');
  });
});
