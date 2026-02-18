/** Translation keys for the biometrics locale package. */
export type BiometricsTranslationKey =
  | 'biometrics.error.notSupported'
  | 'biometrics.error.noPlatformAuth'
  | 'biometrics.error.checkFailed'
  | 'biometrics.error.noCredential'
  | 'biometrics.error.userCancel'
  | 'biometrics.error.permissionDenied'
  | 'biometrics.error.unknown'
  | 'biometrics.device.fingerprint'
  | 'biometrics.device.faceId'
  | 'biometrics.device.touchId'
  | 'biometrics.device.windowsHello'

/** Translation record mapping biometrics keys to translated strings. */
export type BiometricsTranslations = Record<BiometricsTranslationKey, string>
