import UIKit
import React
import React_RCTAppDelegate

/// Owns the window and starts React Native for it.
///
/// Apps built with the iOS 27 SDK must adopt the UIScene life cycle: without a scene manifest and a
/// scene delegate, UIKit aborts at launch with "UIScene life cycle is required for apps built with
/// this SDK" (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`), before any JS runs.
/// The React Native factory is still created once in `AppDelegate`; only the window moved here.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let factory = (UIApplication.shared.delegate as? AppDelegate)?.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    factory.startReactNative(
      withModuleName: "TapSense",
      in: window,
      launchOptions: nil
    )

    // A URL that launched the app arrives on the scene, not in application launch options.
    if let url = connectionOptions.urlContexts.first?.url {
      RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
