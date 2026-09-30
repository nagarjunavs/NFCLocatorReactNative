require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NfcLocator"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/nagarjunavs/NFCLocatorReactNative"
  s.license      = package["license"]
  s.authors      = package["author"]

  # Follows React Native's minimum iOS version.
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/nagarjunavs/NFCLocatorReactNative.git", :tag => "v#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm}"
  s.private_header_files = "ios/**/*.h"
  s.frameworks   = "CoreNFC"

  install_modules_dependencies(s)
end
