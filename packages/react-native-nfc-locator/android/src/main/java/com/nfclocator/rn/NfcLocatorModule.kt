package com.nfclocator.rn

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.nfc.NfcAdapter
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * Supplies raw platform signals to the shared TypeScript core. It decides nothing about
 * confidence or catalog matches; that all lives in JS. Every OEM-variable call is wrapped so a
 * failure surfaces as "unavailable" (null / false / 0), never as a crash or a rejected promise.
 */
class NfcLocatorModule(private val reactContext: ReactApplicationContext) :
  NativeNfcLocatorSpec(reactContext), LifecycleEventListener {

  private val tapSession = TapSession()
  private val sessionCounter = AtomicInteger(0)
  @Volatile private var activeSessionId = 0

  private val foldTracker = FoldTracker {
    val signals = classify()
    emitOnFoldChanged(Arguments.createMap().apply {
      putString("formFactor", signals.first)
      putString("foldState", signals.second)
    })
  }

  private val nfcStateReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) = emitNfcState()
  }
  private var receiverRegistered = false

  init {
    reactContext.addLifecycleEventListener(this)
    registerNfcStateReceiver()
    foldTracker.attach(reactContext.currentActivity)
  }

  private fun adapter(): NfcAdapter? = try {
    NfcAdapter.getDefaultAdapter(reactContext)
  } catch (_: Throwable) {
    null
  }

  private fun smallestWidthDp(): Int =
    reactContext.resources.configuration.smallestScreenWidthDp.takeIf { it != Configuration.SMALLEST_SCREEN_WIDTH_DP_UNDEFINED }
      ?: 0

  /** (formFactor, foldState) from the size heuristic refined by any live hinge reading. */
  private fun classify(): Pair<String, String> {
    val hinge = foldTracker.hinge
    return DeviceClassifier.formFactor(smallestWidthDp(), hinge) to DeviceClassifier.foldState(hinge)
  }

  override fun getDeviceSignals(promise: Promise) {
    try {
      foldTracker.attach(reactContext.currentActivity)
      val (formFactor, foldState) = classify()
      val map = Arguments.createMap().apply {
        putString("manufacturer", Build.MANUFACTURER ?: "")
        putString("brand", Build.BRAND ?: "")
        putString("model", Build.MODEL ?: "")
        putString("device", Build.DEVICE ?: "")
        putString("product", Build.PRODUCT ?: "")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          val sku = Build.SKU
          if (!sku.isNullOrBlank()) putString("sku", sku)
        }
        putString("formFactor", formFactor)
        putString("foldState", foldState)
        putString("screenSizeClass", DeviceClassifier.screenSizeClass(smallestWidthDp()))
        putBoolean("isAndroid14ApiAvailable", Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
      }
      promise.resolve(map)
    } catch (e: Throwable) {
      promise.reject("E_DEVICE_SIGNALS", e)
    }
  }

  override fun getNfcAntennaInfo(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      promise.resolve(null)
      return
    }
    promise.resolve(readAntennaInfo())
  }

  /** Raw OS reading, or null for no adapter / null OEM result / any thrown OEM error. */
  private fun readAntennaInfo(): WritableMap? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return null
    return try {
      val info = adapter()?.nfcAntennaInfo ?: return null
      val antennas = Arguments.createArray()
      for (a in info.availableNfcAntennas) {
        antennas.pushMap(Arguments.createMap().apply {
          putInt("locationX", a.locationX)
          putInt("locationY", a.locationY)
        })
      }
      Arguments.createMap().apply {
        putInt("deviceWidth", info.deviceWidth)
        putInt("deviceHeight", info.deviceHeight)
        putArray("antennas", antennas)
      }
    } catch (_: Throwable) {
      null
    }
  }

  private fun nfcStateMap(): WritableMap {
    val adapter = adapter()
    return Arguments.createMap().apply {
      putBoolean("isSupported", adapter != null)
      putBoolean("isEnabled", adapter?.isEnabled == true)
      putBoolean("canOpenSettings", adapter != null)
    }
  }

  override fun getNfcState(promise: Promise) {
    promise.resolve(try { nfcStateMap() } catch (_: Throwable) {
      Arguments.createMap().apply {
        putBoolean("isSupported", false); putBoolean("isEnabled", false); putBoolean("canOpenSettings", false)
      }
    })
  }

  private fun emitNfcState() {
    try { emitOnNfcStateChanged(nfcStateMap()) } catch (_: Throwable) {}
  }

  private fun registerNfcStateReceiver() {
    if (receiverRegistered) return
    try {
      ContextCompat.registerReceiver(
        reactContext, nfcStateReceiver, IntentFilter(NfcAdapter.ACTION_ADAPTER_STATE_CHANGED),
        ContextCompat.RECEIVER_NOT_EXPORTED,
      )
      receiverRegistered = true
    } catch (_: Throwable) {
    }
  }

  override fun startTapSession(promise: Promise) {
    val activity: Activity? = reactContext.currentActivity
    if (activity == null) {
      promise.resolve(0)
      return
    }
    UiThreadUtil.runOnUiThread {
      // Release any prior registration first so retry() genuinely re-arms the reader.
      tapSession.stop(activity, adapter())
      val id = sessionCounter.incrementAndGet()
      val armed = tapSession.start(activity, adapter()) {
        if (activeSessionId == id) {
          emitOnTagDiscovered(Arguments.createMap().apply { putInt("sessionId", id) })
        }
      }
      if (armed) {
        activeSessionId = id
        promise.resolve(id)
      } else {
        promise.resolve(0)
      }
    }
  }

  override fun stopTapSession() {
    activeSessionId = 0
    val activity = reactContext.currentActivity
    UiThreadUtil.runOnUiThread { tapSession.stop(activity, adapter()) }
  }

  override fun openNfcSettings(promise: Promise) {
    if (adapter() == null) {
      promise.resolve(false)
      return
    }
    try {
      val intent = Intent(Settings.ACTION_NFC_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (_: Throwable) {
      // ActivityNotFoundException on devices with nothing to configure: no-op, never crash.
      promise.resolve(false)
    }
  }

  override fun onHostResume() {
    foldTracker.attach(reactContext.currentActivity)
    // The broadcast alone can be throttled/missed for a backgrounded process on some OEMs.
    emitNfcState()
  }

  override fun onHostPause() {
    // Reader mode is bound to the foreground activity: release it. JS re-arms on resume and
    // is told the session ended so it never sits on "Detecting" with nothing behind it.
    val id = activeSessionId
    if (id != 0) {
      activeSessionId = 0
      tapSession.stop(reactContext.currentActivity, adapter())
      try {
        emitOnTapSessionEnded(Arguments.createMap().apply {
          putInt("sessionId", id); putBoolean("becameActive", true); putString("code", "HOST_PAUSED"); putString("message", "")
        })
      } catch (_: Throwable) {}
    }
  }

  override fun onHostDestroy() {
    foldTracker.detach()
  }

  override fun invalidate() {
    reactContext.removeLifecycleEventListener(this)
    foldTracker.detach()
    if (receiverRegistered) {
      try { reactContext.unregisterReceiver(nfcStateReceiver) } catch (_: Throwable) {}
      receiverRegistered = false
    }
    activeSessionId = 0
    super.invalidate()
  }

  companion object {
    const val NAME = NativeNfcLocatorSpec.NAME
  }
}
