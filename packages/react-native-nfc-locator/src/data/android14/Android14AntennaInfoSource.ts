import type { AntennaLocationSource, NfcLocatorLogger } from '../../domain/seams';
import {
  type DeviceAntennaProfile,
  type DeviceIdentitySignals,
  toSilhouetteTemplateId,
} from '../../domain/model/DeviceAntennaProfile';
import { Confidence, DataSource } from '../../domain/model/enums';
import { toNormalizedZoneOrNull } from './Android14AntennaInfoMapper';
import type { NfcAntennaInfoProvider, RawNfcAntennaInfo } from './types';

const TAG = 'Android14AntennaInfoSource';

/**
 * Layer 1 (highest priority): OS-reported antenna position (Android 14+ only). The only
 * source that earns `EXACT` from a live measurement of this exact unit.
 *
 * Every case where the API is unsupported, empty or implausible returns `null` so the chain
 * falls through. A provider exception is propagated: the use case already treats
 * any thrown source as a miss, and the native provider owns the try/catch around the OS call.
 */
export class Android14AntennaInfoSource implements AntennaLocationSource {
  constructor(
    private readonly provider: NfcAntennaInfoProvider,
    private readonly logger: NfcLocatorLogger,
  ) {}

  async resolve(signals: DeviceIdentitySignals): Promise<DeviceAntennaProfile | null> {
    if (!signals.isAndroid14ApiAvailable) return null;
    const info = await this.provider.getAntennaInfo();
    if (!info) return null;
    return this.buildProfile(info, signals);
  }

  private buildProfile(info: RawNfcAntennaInfo, signals: DeviceIdentitySignals): DeviceAntennaProfile | null {
    if (info.antennas.length === 0) {
      this.logger.d(TAG, 'NfcAntennaInfo reported zero antennas');
      return null;
    }
    // A foldable may expose more than one physical antenna; pick the one matching fold state.
    const antennaIndex = signals.foldState === 'UNFOLDED' ? info.antennas.length - 1 : 0;
    const zone = toNormalizedZoneOrNull(info, antennaIndex);
    if (!zone) {
      this.logger.w(TAG, 'Rejected implausible NfcAntennaInfo reading');
      return null;
    }
    return {
      manufacturer: signals.fingerprint.manufacturer,
      model: signals.fingerprint.model,
      formFactor: signals.formFactor,
      silhouetteTemplateId: toSilhouetteTemplateId(signals.formFactor, signals.foldState),
      antennaZone: zone,
      confidence: Confidence.EXACT,
      source: DataSource.ANDROID14_API,
      catalogVersion: 0,
      lastVerifiedAtEpochMs: null,
      // Real per-unit dimensions, already validated non-zero by the mapper.
      aspectRatio: info.deviceWidth / info.deviceHeight,
    };
  }
}
