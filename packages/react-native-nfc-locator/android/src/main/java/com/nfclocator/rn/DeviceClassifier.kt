package com.nfclocator.rn

/**
 * Pure classification logic, kept free of Android types so it is JVM unit-testable.
 * A smallest width of at least 600dp is a tablet, at least 480dp is medium.
 */
internal object DeviceClassifier {
  const val TABLET_SMALLEST_WIDTH_DP = 600
  const val MEDIUM_SMALLEST_WIDTH_DP = 480

  enum class Hinge { NONE, VERTICAL, HORIZONTAL }

  fun screenSizeClass(smallestWidthDp: Int): String = when {
    smallestWidthDp >= TABLET_SMALLEST_WIDTH_DP -> "EXPANDED"
    smallestWidthDp >= MEDIUM_SMALLEST_WIDTH_DP -> "MEDIUM"
    else -> "COMPACT"
  }

  /** A vertical hinge is a book-style foldable, a horizontal one a flip; else size heuristic. */
  fun formFactor(smallestWidthDp: Int, hinge: Hinge): String = when (hinge) {
    Hinge.VERTICAL -> "FOLD_BOOK"
    Hinge.HORIZONTAL -> "FOLD_FLIP"
    Hinge.NONE -> if (smallestWidthDp >= TABLET_SMALLEST_WIDTH_DP) "TABLET" else "BAR"
  }

  /**
   * Any currently reported hinge (FLAT or HALF_OPENED) means the device is not closed.
   * `androidx.window` reports no FoldingFeature for a book-style foldable showing only its
   * cover display, indistinguishable from a bar phone, so FOLDED is never assigned by live
   * detection.
   */
  fun foldState(hinge: Hinge): String = if (hinge == Hinge.NONE) "NOT_APPLICABLE" else "UNFOLDED"
}
