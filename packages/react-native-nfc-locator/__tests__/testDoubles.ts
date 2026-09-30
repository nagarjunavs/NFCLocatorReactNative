import type {
  AntennaLocationSource,
  CatalogCache,
  DeviceAntennaProfile,
  DeviceIdentitySignals,
  NfcLocatorAnalytics,
  NfcLocatorLogger,
} from '../src';
import { deviceFingerprint, normalizedRect, toSilhouetteTemplateId } from '../src';

export function makeSignals(overrides: Partial<DeviceIdentitySignals> = {}): DeviceIdentitySignals {
  return {
    fingerprint: deviceFingerprint('google', 'google', 'pixel_8', 'shiba', 'shiba', null),
    formFactor: 'BAR',
    foldState: 'NOT_APPLICABLE',
    screenSizeClass: 'COMPACT',
    isAndroid14ApiAvailable: true,
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<DeviceAntennaProfile> = {}): DeviceAntennaProfile {
  return {
    manufacturer: 'google',
    model: 'pixel_8',
    formFactor: 'BAR',
    silhouetteTemplateId: toSilhouetteTemplateId('BAR', 'NOT_APPLICABLE'),
    antennaZone: normalizedRect(0.3, 0.2, 0.4, 0.14),
    confidence: 'APPROXIMATE',
    source: 'REMOTE_CATALOG',
    catalogVersion: 1,
    lastVerifiedAtEpochMs: null,
    ...overrides,
  };
}

export function fakeAnalytics(): jest.Mocked<NfcLocatorAnalytics> {
  return {
    guidanceShown: jest.fn(),
    guidanceDismissed: jest.fn(),
    unknownDeviceDetected: jest.fn(),
    catalogMatchFound: jest.fn(),
    android14AntennaDetected: jest.fn(),
    retryGuidanceShown: jest.fn(),
  };
}

export function fakeLogger(): jest.Mocked<NfcLocatorLogger> {
  return { d: jest.fn(), w: jest.fn(), e: jest.fn() };
}

export function fakeSource(result: DeviceAntennaProfile | null | Error): jest.Mocked<AntennaLocationSource> {
  return {
    resolve: jest.fn(async (_signals: DeviceIdentitySignals) => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

export function fakeCache(): jest.Mocked<CatalogCache> {
  return {
    find: jest.fn(async (_keys: readonly string[]) => null as DeviceAntennaProfile | null),
    upsertAll: jest.fn(async (_entries: ReadonlyArray<readonly [string, DeviceAntennaProfile]>) => {}),
    latestCachedVersion: jest.fn(async () => 0),
    listAll: jest.fn(async () => []),
  };
}
