#import "NfcLocator.h"

#import <CoreNFC/CoreNFC.h>
#import <React/RCTInvalidating.h>
#import <UIKit/UIKit.h>
#include <sys/sysctl.h>

/**
 * Supplies raw platform signals to the shared TypeScript core. iOS has no public API that
 * reports where the antenna sits (Core NFC reads tags, never antenna geometry), so
 * getNfcAntennaInfo always resolves null and the JS chain runs its 3-layer form.
 */
@interface NfcLocator () <NFCTagReaderSessionDelegate, RCTInvalidating>
@end

@implementation NfcLocator {
  NFCTagReaderSession *_session;   // touched on the main queue only
  NSInteger _sessionId;
  NSInteger _sessionCounter;
  BOOL _sessionBecameActive;
}

RCT_EXPORT_MODULE(NfcLocator)

+ (BOOL)requiresMainQueueSetup { return NO; }

#pragma mark - Device signals

/// Raw hardware identifier, e.g. "iPhone15,2" (the exact form the seed catalog's Apple entries
/// are keyed by once normalized to "iphone15_2").
static NSString *NFCLHardwareMachine(void) {
  size_t size = 0;
  sysctlbyname("hw.machine", NULL, &size, NULL, 0);
  if (size == 0) return @"unknown";
  char *raw = (char *)malloc(size);
  if (sysctlbyname("hw.machine", raw, &size, NULL, 0) != 0) {
    free(raw);
    return @"unknown";
  }
  NSString *machine = [NSString stringWithUTF8String:raw] ?: @"unknown";
  free(raw);
  return machine;
}

- (void)getDeviceSignals:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    CGRect bounds = UIScreen.mainScreen.bounds;
    CGFloat smallest = MIN(bounds.size.width, bounds.size.height);
    BOOL isPad = UIDevice.currentDevice.userInterfaceIdiom == UIUserInterfaceIdiomPad;
    // No foldable/hinge API exists on iOS: form factor is purely idiom-derived.
    NSString *screenClass = smallest >= 600 ? @"EXPANDED" : (smallest >= 480 ? @"MEDIUM" : @"COMPACT");
    NSString *machine = NFCLHardwareMachine();
    resolve(@{
      @"manufacturer": @"apple",
      @"brand": @"apple",
      @"model": machine,
      @"device": machine,
      @"product": machine,
      @"formFactor": isPad ? @"TABLET" : @"BAR",
      @"foldState": @"NOT_APPLICABLE",
      @"screenSizeClass": screenClass,
      @"isAndroid14ApiAvailable": @NO,
    });
  });
}

- (void)getNfcAntennaInfo:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve(nil);
}

#pragma mark - NFC state

/// iOS has no user-facing NFC on/off toggle: reading is either available (hardware + OS) or
/// not, so isEnabled mirrors isSupported and there are no state-change events.
- (NSDictionary *)nfcState {
  BOOL available = NFCTagReaderSession.readingAvailable;
  return @{ @"isSupported": @(available), @"isEnabled": @(available), @"canOpenSettings": @NO };
}

- (void)getNfcState:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([self nfcState]);
}

- (void)openNfcSettings:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve(@NO);
}

#pragma mark - Tap session

- (void)startTapSession:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    // Note: readingAvailable is a hardware+OS check only. It does NOT prove the app's NFC
    // entitlement is provisioned, so a session can still be rejected right after begin().
    if (!NFCTagReaderSession.readingAvailable) {
      NSLog(@"[NfcLocator] startTapSession aborted: NFCTagReaderSession.readingAvailable is false");
      resolve(@0);
      return;
    }
    // Invalidate any previous session first so retry genuinely re-arms Core NFC. Clearing
    // _session before invalidate makes that session's late callback stale (identity check).
    NFCTagReaderSession *previous = self->_session;
    self->_session = nil;
    [previous invalidateSession];

    NFCTagReaderSession *session =
        [[NFCTagReaderSession alloc] initWithPollingOption:(NFCPollingISO14443 | NFCPollingISO15693 | NFCPollingISO18092)
                                                  delegate:self
                                                     queue:nil];
    if (session == nil) {
      NSLog(@"[NfcLocator] startTapSession aborted: NFCTagReaderSession init returned nil");
      resolve(@0);
      return;
    }
    session.alertMessage = NSLocalizedStringWithDefaultValue(
        @"nfc_locator_reader_alert", nil, NSBundle.mainBundle,
        @"Hold the top of your iPhone near an NFC tag or reader.", @"System NFC sheet prompt");
    self->_sessionBecameActive = NO;
    self->_sessionId = ++self->_sessionCounter;
    self->_session = session;
    [session beginSession];
    resolve(@(self->_sessionId));
  });
}

- (void)stopTapSession
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NFCTagReaderSession *session = self->_session;
    self->_session = nil;   // makes the session's own invalidation callback stale
    self->_sessionId = 0;
    [session invalidateSession];
  });
}

// Called when the React instance goes away (for example a reload): close any open NFC sheet.
- (void)invalidate
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NFCTagReaderSession *session = self->_session;
    self->_session = nil;
    self->_sessionId = 0;
    [session invalidateSession];
  });
}

#pragma mark - NFCTagReaderSessionDelegate

// Identity-compare against the currently held session instead of a shared boolean flag:
// retry() may already have installed a NEW session before the OLD one's async invalidation
// arrives, and a flag shared across generations would race exactly that sequence.

- (void)tagReaderSessionDidBecomeActive:(NFCTagReaderSession *)session
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (session != self->_session) return;
    self->_sessionBecameActive = YES;
  });
}

- (void)tagReaderSession:(NFCTagReaderSession *)session didInvalidateWithError:(NSError *)error
{
  dispatch_async(dispatch_get_main_queue(), ^{
    BOOL becameActive = self->_sessionBecameActive;
    // Error level on purpose: the one diagnostic for a real-device failure that cannot be
    // reproduced in the Simulator (code 2 == missing entitlement, see the README).
    NSLog(@"[NfcLocator] Session invalidated (becameActive: %d, domain: %@, code: %ld): %@",
          becameActive, error.domain, (long)error.code, error.localizedDescription);
    if (session != self->_session) return;   // stale callback for a replaced session
    NSInteger sessionId = self->_sessionId;
    self->_session = nil;
    self->_sessionId = 0;
    [self emitOnTapSessionEnded:@{
      @"sessionId": @(sessionId),
      @"becameActive": @(becameActive),
      @"code": [NSString stringWithFormat:@"%@:%ld", error.domain, (long)error.code],
      @"message": error.localizedDescription ?: @"",
    }];
  });
}

- (void)tagReaderSession:(NFCTagReaderSession *)session didDetectTags:(NSArray<__kindof id<NFCTag>> *)tags
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (session != self->_session) return;
    [self emitOnTagDiscovered:@{ @"sessionId": @(self->_sessionId) }];
    [session restartPolling];
  });
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeNfcLocatorSpecJSI>(params);
}

@end
