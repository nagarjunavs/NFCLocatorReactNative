import { createNativeTapReader, type NativeNfcLocatorModule } from '../src/native';

type Listener<T> = (e: T) => void;
function fakeNative(startResult: number | (() => Promise<number>) = 1) {
  const tag: Array<Listener<any>> = [];
  const ended: Array<Listener<any>> = [];
  const sub = (arr: Array<Listener<any>>) => (l: Listener<any>) => {
    arr.push(l);
    return { remove: () => void arr.splice(arr.indexOf(l), 1) };
  };
  const native = {
    startTapSession: jest.fn(typeof startResult === 'function' ? startResult : async () => startResult),
    stopTapSession: jest.fn(),
    onTagDiscovered: sub(tag),
    onTapSessionEnded: sub(ended),
  } as unknown as NativeNfcLocatorModule;
  return { native, emitTag: (id: number) => [...tag].forEach((l) => l({ sessionId: id })), emitEnded: (id: number, becameActive: boolean) => [...ended].forEach((l) => l({ sessionId: id, becameActive, code: 'X:1', message: 'm' })), counts: () => ({ tag: tag.length, ended: ended.length }) };
}

describe('createNativeTapReader', () => {
  it('start resolves true for a positive session id and forwards tag events for that session', async () => {
    const f = fakeNative(7);
    const reader = createNativeTapReader(f.native);
    const onTag = jest.fn();
    expect(await reader.start(onTag, jest.fn())).toBe(true);
    f.emitTag(7);
    expect(onTag).toHaveBeenCalledTimes(1);
  });

  it('start resolves false and unsubscribes when the native side could not start (id 0)', async () => {
    const f = fakeNative(0);
    const reader = createNativeTapReader(f.native);
    expect(await reader.start(jest.fn(), jest.fn())).toBe(false);
    expect(f.counts()).toEqual({ tag: 0, ended: 0 });
  });

  it('reports sessionEnded with becameActive (distinguishes "never started" from "timed out")', async () => {
    const f = fakeNative(3);
    const onEnded = jest.fn();
    await createNativeTapReader(f.native).start(jest.fn(), onEnded);
    f.emitEnded(3, false);
    expect(onEnded).toHaveBeenCalledWith({ becameActive: false, code: 'X:1', message: 'm' });
  });

  it('ignores stale events from a previous session id (identity, not a flag)', async () => {
    let n = 0;
    const f = fakeNative(async () => ++n);
    const reader = createNativeTapReader(f.native);
    const onTag = jest.fn();
    const onEnded = jest.fn();
    await reader.start(onTag, onEnded); // session 1
    await reader.start(onTag, onEnded); // retry: session 2
    f.emitEnded(1, true); // late callback for the OLD session
    f.emitTag(1);
    expect(onEnded).not.toHaveBeenCalled();
    expect(onTag).not.toHaveBeenCalled();
    f.emitTag(2);
    expect(onTag).toHaveBeenCalledTimes(1);
  });

  it('retry genuinely re-arms the native session', async () => {
    const f = fakeNative(1);
    const reader = createNativeTapReader(f.native);
    await reader.start(jest.fn(), jest.fn());
    await reader.start(jest.fn(), jest.fn());
    expect((f.native.startTapSession as jest.Mock)).toHaveBeenCalledTimes(2);
  });

  it('accepts a sessionEnded that arrives before the start promise resolves', async () => {
    let release!: (id: number) => void;
    const f = fakeNative(() => new Promise<number>((r) => (release = r)));
    const onEnded = jest.fn();
    const p = createNativeTapReader(f.native).start(jest.fn(), onEnded);
    f.emitEnded(5, false); // iOS may reject the session before the JS promise settles
    release(5);
    await p;
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('stop unsubscribes and stops the native session; later events are ignored', async () => {
    const f = fakeNative(4);
    const reader = createNativeTapReader(f.native);
    const onTag = jest.fn();
    await reader.start(onTag, jest.fn());
    reader.stop();
    f.emitTag(4);
    expect(onTag).not.toHaveBeenCalled();
    expect(f.native.stopTapSession).toHaveBeenCalled();
    expect(f.counts()).toEqual({ tag: 0, ended: 0 });
  });
});
