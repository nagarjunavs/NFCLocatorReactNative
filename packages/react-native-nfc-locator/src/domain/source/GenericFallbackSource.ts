import type { AntennaLocationSource } from '../seams';
import {
  type DeviceAntennaProfile,
  type DeviceIdentitySignals,
  toSilhouetteTemplateId,
} from '../model/DeviceAntennaProfile';
import { Confidence, DataSource, type FoldState, type FormFactor } from '../model/enums';
import { centeredSquare, type NormalizedRect } from '../model/NormalizedRect';

/**
 * Layer 4 (last resort): a pure form-factor heuristic with no I/O. Always succeeds, so the
 * chain always terminates and the UI always gets a profile, always at `GENERIC`, which the UI
 * must pair with the guided sweep, never a confident marker.
 */
export class GenericFallbackSource implements AntennaLocationSource {
  async resolve(signals: DeviceIdentitySignals): Promise<DeviceAntennaProfile> {
    return {
      manufacturer: signals.fingerprint.manufacturer,
      model: signals.fingerprint.model,
      formFactor: signals.formFactor,
      silhouetteTemplateId: toSilhouetteTemplateId(signals.formFactor, signals.foldState),
      antennaZone: zoneFor(signals.formFactor, signals.foldState),
      confidence: Confidence.GENERIC,
      source: DataSource.HEURISTIC,
      catalogVersion: 0,
      lastVerifiedAtEpochMs: null,
    };
  }
}

function zoneFor(formFactor: FormFactor, foldState: FoldState): NormalizedRect {
  switch (formFactor) {
    // Most bar phones: upper-center rear, near the main camera bump.
    case 'BAR':
      return centeredSquare(0.5, 0.22, 0.3);
    // Tablets commonly center the antenna mid-back regardless of orientation.
    case 'TABLET':
      return centeredSquare(0.5, 0.45, 0.34);
    case 'FOLD_BOOK':
      // Folded: behaves like a thick bar phone. Unfolded: one inner half, away from the hinge.
      return foldState === 'FOLDED' ? centeredSquare(0.5, 0.24, 0.34) : centeredSquare(0.25, 0.5, 0.3);
    case 'FOLD_FLIP':
      // Folded (pocket-sized): center rear, near the cover screen/hinge.
      return foldState === 'FOLDED' ? centeredSquare(0.5, 0.45, 0.34) : centeredSquare(0.5, 0.28, 0.32);
  }
}
