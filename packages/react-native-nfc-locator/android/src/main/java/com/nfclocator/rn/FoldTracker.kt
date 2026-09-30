package com.nfclocator.rn

import android.app.Activity
import androidx.core.util.Consumer
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import java.util.concurrent.Executor

/**
 * Keeps the latest hinge reading from `androidx.window` readable synchronously. Attach on
 * host resume, detach on pause/destroy. Every call is guarded: a failure here must never
 * take the host app down, it just means "no fold signal".
 */
internal class FoldTracker(private val onChanged: () -> Unit) {
  @Volatile var hinge: DeviceClassifier.Hinge = DeviceClassifier.Hinge.NONE
    private set

  private var adapter: WindowInfoTrackerCallbackAdapter? = null
  private var attachedTo: Activity? = null
  private val mainExecutor = Executor { it.run() }
  private val consumer = Consumer<WindowLayoutInfo> { info ->
    val fold = info.displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull()
    val next = when (fold?.orientation) {
      FoldingFeature.Orientation.VERTICAL -> DeviceClassifier.Hinge.VERTICAL
      FoldingFeature.Orientation.HORIZONTAL -> DeviceClassifier.Hinge.HORIZONTAL
      else -> DeviceClassifier.Hinge.NONE
    }
    if (next != hinge) {
      hinge = next
      onChanged()
    }
  }

  @Synchronized
  fun attach(activity: Activity?) {
    if (activity == null || attachedTo === activity) return
    detach()
    try {
      val a = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(activity))
      a.addWindowLayoutInfoListener(activity, mainExecutor, consumer)
      adapter = a
      attachedTo = activity
    } catch (_: Throwable) {
      adapter = null
      attachedTo = null
    }
  }

  @Synchronized
  fun detach() {
    try {
      adapter?.removeWindowLayoutInfoListener(consumer)
    } catch (_: Throwable) {
    }
    adapter = null
    attachedTo = null
  }
}
