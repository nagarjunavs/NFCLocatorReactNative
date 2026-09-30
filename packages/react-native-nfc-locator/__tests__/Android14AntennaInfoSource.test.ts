import {
  Android14AntennaInfoSource,
  type NfcAntennaInfoProvider,
  type RawNfcAntennaInfo,
  toNormalizedZoneOrNull,
  centerX,
  centerY,
  rectEquals,
} from '../src';
import { fakeLogger, makeSignals } from './testDoubles';

const info = (w: number, h: number, antennas: Array<[number, number]>): RawNfcAntennaInfo => ({
  deviceWidth: w,
  deviceHeight: h,
  antennas: antennas.map(([locationX, locationY]) => ({ locationX, locationY })),
});

function build(result: RawNfcAntennaInfo | null | Error) {
  const provider: NfcAntennaInfoProvider = {
    getAntennaInfo: jest.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
  return { provider, source: new Android14AntennaInfoSource(provider, fakeLogger()) };
}

describe('Android14AntennaInfoSource', () => {
  it('returns null when the api is not available for this signal set', async () => {
    const { source, provider } = build(info(100, 200, [[50, 40]]));
    expect(await source.resolve(makeSignals({ isAndroid14ApiAvailable: false }))).toBeNull();
    expect(provider.getAntennaInfo).not.toHaveBeenCalled();
  });

  it('returns null when the provider returns null', async () => {
    expect(await build(null).source.resolve(makeSignals())).toBeNull();
  });

  it('propagates a provider exception (the use case treats it as a miss)', async () => {
    await expect(build(new Error('OEM bug')).source.resolve(makeSignals())).rejects.toThrow('OEM bug');
  });

  it('rejects zero device bounds as implausible', async () => {
    expect(await build(info(0, 0, [[0, 0]])).source.resolve(makeSignals())).toBeNull();
  });

  it('rejects negative device bounds and non-finite values', async () => {
    expect(await build(info(-100, 200, [[10, 10]])).source.resolve(makeSignals())).toBeNull();
    expect(await build(info(100, NaN, [[10, 10]])).source.resolve(makeSignals())).toBeNull();
    expect(await build(info(100, 200, [[NaN, 10]])).source.resolve(makeSignals())).toBeNull();
    expect(await build(info(Infinity, 200, [[10, 10]])).source.resolve(makeSignals())).toBeNull();
  });

  it('rejects an antenna location outside the device bounds', async () => {
    expect(await build(info(100, 200, [[150, 40]])).source.resolve(makeSignals())).toBeNull();
    expect(await build(info(100, 200, [[10, -1]])).source.resolve(makeSignals())).toBeNull();
    expect(await build(info(100, 200, [[10, 201]])).source.resolve(makeSignals())).toBeNull();
  });

  it('rejects a reading with zero antennas', async () => {
    expect(await build(info(100, 200, [])).source.resolve(makeSignals())).toBeNull();
  });

  it('accepts a plausible reading: fractional coordinates, EXACT, real aspect ratio', async () => {
    const r = await build(info(100, 200, [[50, 40]])).source.resolve(makeSignals());
    expect(r).not.toBeNull();
    expect(r!.confidence).toBe('EXACT');
    expect(r!.source).toBe('ANDROID14_API');
    expect(centerX(r!.antennaZone)).toBeCloseTo(0.5, 2);
    expect(centerY(r!.antennaZone)).toBeCloseTo(0.2, 2);
    expect(r!.aspectRatio).toBeCloseTo(0.5, 5);
  });

  it('folded vs unfolded selects a different antenna when multiple are reported', async () => {
    const both = info(100, 200, [[20, 20], [80, 180]]);
    const folded = await build(both).source.resolve(makeSignals({ foldState: 'FOLDED' }));
    const unfolded = await build(both).source.resolve(makeSignals({ foldState: 'UNFOLDED' }));
    // Mirrored: front-frame x=20 (FOLDED, index 0) -> back centerX 0.8; x=80 (UNFOLDED) -> 0.2.
    expect(centerX(folded!.antennaZone)).toBeCloseTo(0.8, 2);
    expect(centerX(unfolded!.antennaZone)).toBeCloseTo(0.2, 2);
    expect(rectEquals(folded!.antennaZone, unfolded!.antennaZone)).toBe(false);
  });

  it('flips X: NfcAntennaInfo is front-relative but the silhouette is the back panel', async () => {
    const r = await build(info(100, 200, [[25, 100]])).source.resolve(makeSignals());
    expect(centerX(r!.antennaZone)).toBeCloseTo(0.75, 2);
    expect(centerY(r!.antennaZone)).toBeCloseTo(0.5, 2);
  });

  it('mapper returns null for an out-of-range antenna index', () => {
    expect(toNormalizedZoneOrNull(info(100, 200, [[50, 40]]), 3)).toBeNull();
  });
});
