/** Translation keys for the splash-screen locale package. */
export type SplashScreenTranslationKey =
  | 'splashScreen.error.noProvider'
  | 'splashScreen.warn.configureNotSupported'

/** Translation record mapping splash-screen keys to translated strings. */
export type SplashScreenTranslations = Record<SplashScreenTranslationKey, string>
