import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Punjabi. */
export const pa: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ਇਸ ਸਪਲੈਸ਼ ਸਕ੍ਰੀਨ ਪ੍ਰੋਵਾਈਡਰ ਦੁਆਰਾ ਸਮਰਥਿਤ ਨਹੀਂ ਹੈ।',
  'splashScreen.error.missingDependency':
    '`{{library}}` ਦੀ ਲੋੜ ਹੈ ਪਰ ਇੰਸਟਾਲ ਨਹੀਂ ਹੈ। ਇਸਨੂੰ ਇਸ ਨਾਲ ਇੰਸਟਾਲ ਕਰੋ: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: ਕੋਈ ਪ੍ਰਦਾਤਾ ਸੈੱਟ ਨਹੀਂ ਹੈ। `setProvider()` ਨੂੰ `SplashScreenProvider` ਲਾਗੂਕਰਨ ਨਾਲ ਕਾਲ ਕਰੋ (ਜਿਵੇਂ ਕਿ, `@molecule/app-splash-screen-react-native` ਤੋਂ)।',
}
