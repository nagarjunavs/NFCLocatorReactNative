package com.nfclocator.rn

import com.nfclocator.rn.DeviceClassifier.Hinge
import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceClassifierTest {
  @Test fun screenSizeClassBoundaries() {
    assertEquals("COMPACT", DeviceClassifier.screenSizeClass(411))
    assertEquals("COMPACT", DeviceClassifier.screenSizeClass(479))
    assertEquals("MEDIUM", DeviceClassifier.screenSizeClass(480))
    assertEquals("MEDIUM", DeviceClassifier.screenSizeClass(599))
    assertEquals("EXPANDED", DeviceClassifier.screenSizeClass(600))
  }

  @Test fun formFactorFromHingeOrientationThenSize() {
    assertEquals("FOLD_BOOK", DeviceClassifier.formFactor(411, Hinge.VERTICAL))
    assertEquals("FOLD_FLIP", DeviceClassifier.formFactor(411, Hinge.HORIZONTAL))
    assertEquals("BAR", DeviceClassifier.formFactor(411, Hinge.NONE))
    assertEquals("TABLET", DeviceClassifier.formFactor(800, Hinge.NONE))
    // A real hinge wins over the size heuristic even on a large unfolded inner display.
    assertEquals("FOLD_BOOK", DeviceClassifier.formFactor(700, Hinge.VERTICAL))
  }

  @Test fun foldStateIsUnfoldedOnlyWhenAHingeIsObserved() {
    assertEquals("NOT_APPLICABLE", DeviceClassifier.foldState(Hinge.NONE))
    assertEquals("UNFOLDED", DeviceClassifier.foldState(Hinge.VERTICAL))
    assertEquals("UNFOLDED", DeviceClassifier.foldState(Hinge.HORIZONTAL))
  }
}
