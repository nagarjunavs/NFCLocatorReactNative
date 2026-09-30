import { GenericFallbackSource, ResolveAntennaLocationUseCase } from '../src';
import { fakeAnalytics, fakeLogger, fakeSource, makeProfile, makeSignals } from './testDoubles';

const signals = makeSignals();

function build(parts: Partial<Record<'a14' | 'remote' | 'seed' | 'generic', ReturnType<typeof fakeSource> | null>>) {
  const analytics = fakeAnalytics();
  const logger = fakeLogger();
  const a14 = parts.a14 === undefined ? fakeSource(null) : parts.a14;
  const remote = parts.remote ?? fakeSource(null);
  const seed = parts.seed ?? fakeSource(null);
  const generic = parts.generic ?? fakeSource(makeProfile({ source: 'HEURISTIC', confidence: 'GENERIC' }));
  const useCase = new ResolveAntennaLocationUseCase(
    { android14Source: a14, remoteCatalogSource: remote, seedCatalogSource: seed, genericFallbackSource: generic },
    analytics,
    logger,
  );
  return { useCase, analytics, logger, a14, remote, seed, generic };
}

describe('ResolveAntennaLocationUseCase', () => {
  it('android14 source wins when it returns a result; remaining sources are not consulted', async () => {
    const profile = makeProfile({ source: 'ANDROID14_API', confidence: 'EXACT' });
    const t = build({ a14: fakeSource(profile) });
    expect(await t.useCase.invoke(signals)).toBe(profile);
    expect(t.remote.resolve).not.toHaveBeenCalled();
    expect(t.seed.resolve).not.toHaveBeenCalled();
    expect(t.generic.resolve).not.toHaveBeenCalled();
    expect(t.analytics.android14AntennaDetected).toHaveBeenCalledWith(1);
  });

  it('falls through to remote catalog when android14 returns null', async () => {
    const profile = makeProfile({ source: 'REMOTE_CATALOG' });
    const t = build({ remote: fakeSource(profile) });
    expect(await t.useCase.invoke(signals)).toBe(profile);
    expect(t.seed.resolve).not.toHaveBeenCalled();
    expect(t.analytics.catalogMatchFound).toHaveBeenCalledWith('APPROXIMATE', 'REMOTE_CATALOG', 1);
  });

  it('falls through to seed catalog when android14 and remote both miss', async () => {
    const profile = makeProfile({ source: 'SEED_CATALOG' });
    const t = build({ seed: fakeSource(profile) });
    expect(await t.useCase.invoke(signals)).toBe(profile);
    expect(t.generic.resolve).not.toHaveBeenCalled();
  });

  it('falls all the way through to the generic fallback, which always answers', async () => {
    const t = build({});
    const result = await t.useCase.invoke(signals);
    expect(result.confidence).toBe('GENERIC');
    expect(t.analytics.unknownDeviceDetected).toHaveBeenCalledWith('google', 'BAR');
  });

  it('a source throwing is treated as a miss, logged, and the chain continues', async () => {
    const profile = makeProfile({ source: 'REMOTE_CATALOG' });
    const t = build({ a14: fakeSource(new Error('OEM bug')), remote: fakeSource(profile) });
    expect(await t.useCase.invoke(signals)).toBe(profile);
    expect(t.logger.e).toHaveBeenCalledTimes(1);
  });

  it('every layer falls through on both null and throw (priority + fallback at each layer)', async () => {
    for (const miss of [null, new Error('boom')]) {
      const t = build({ a14: fakeSource(miss), remote: fakeSource(miss), seed: fakeSource(miss) });
      expect((await t.useCase.invoke(signals)).source).toBe('HEURISTIC');
    }
  });

  it('reports guidanceShown exactly once per resolution with the winning profile attributes', async () => {
    const t = build({ seed: fakeSource(makeProfile({ source: 'SEED_CATALOG', confidence: 'EXACT' })) });
    await t.useCase.invoke(signals);
    expect(t.analytics.guidanceShown).toHaveBeenCalledTimes(1);
    expect(t.analytics.guidanceShown).toHaveBeenCalledWith('EXACT', 'SEED_CATALOG', 'BAR');
  });

  it('runs a 3-layer chain when no android14 source is supplied (iOS)', async () => {
    const remote = fakeSource(null);
    const t = build({ a14: null, remote });
    const result = await t.useCase.invoke(signals);
    expect(remote.resolve).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('HEURISTIC');
  });

  it('throws if the chain is exhausted (defensive; generic must always succeed)', async () => {
    const t = build({ generic: fakeSource(null) });
    await expect(t.useCase.invoke(signals)).rejects.toThrow(/exhausted/);
  });

  it('works end-to-end with the real GenericFallbackSource', async () => {
    const t = build({ generic: new GenericFallbackSource() as any });
    expect((await t.useCase.invoke(makeSignals({ formFactor: 'TABLET' }))).silhouetteTemplateId).toBe('silhouette_tablet');
  });
});
