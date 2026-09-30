package com.nfclocator.rn

import android.app.Activity
import android.nfc.NfcAdapter

private const val READER_FLAGS = NfcAdapter.FLAG_READER_NFC_A or
  NfcAdapter.FLAG_READER_NFC_B or
  NfcAdapter.FLAG_READER_NFC_F or
  NfcAdapter.FLAG_READER_NFC_V or
  NfcAdapter.FLAG_READER_NFC_BARCODE

/**
 * Thin boundary around `NfcAdapter#enableReaderMode()`: the real tag-detection path, not a
 * timer. Every OEM-variable call is guarded (null adapter, disabled adapter and any exception
 * all mean "can't detect", never a crash). Reader mode is bound to the foreground activity, so
 * the module releases it on host pause and JS re-arms it on resume.
 */
internal class TapSession {
  /** Returns true if reader mode is armed. Must run on the UI thread. */
  fun start(activity: Activity, adapter: NfcAdapter?, onTag: () -> Unit): Boolean {
    if (adapter == null || !adapter.isEnabled) return false
    return try {
      adapter.enableReaderMode(activity, { onTag() }, READER_FLAGS, null)
      true
    } catch (_: Throwable) {
      false
    }
  }

  fun stop(activity: Activity?, adapter: NfcAdapter?) {
    if (activity == null || adapter == null) return
    try {
      adapter.disableReaderMode(activity)
    } catch (_: Throwable) {
    }
  }
}
