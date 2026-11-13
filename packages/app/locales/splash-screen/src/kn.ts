import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Kannada. */
export const kn: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ಈ ಸ್ಪ್ಲಾಶ್ ಸ್ಕ್ರೀನ್ ಪ್ರೊವೈಡರ್‌ನಿಂದ ಬೆಂಬಲಿತವಲ್ಲ.',
  'splashScreen.error.missingDependency':
    '`{{library}}` ಅಗತ್ಯವಿದೆ ಆದರೆ ಸ್ಥಾಪಿಸಲಾಗಿಲ್ಲ. ಇದನ್ನು ಇದರೊಂದಿಗೆ ಸ್ಥಾಪಿಸಿ: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: ಯಾವುದೇ ಪೂರೈಕೆದಾರರನ್ನು ಹೊಂದಿಸಲಾಗಿಲ್ಲ. `SplashScreenProvider` ಅನುಷ್ಠಾನದೊಂದಿಗೆ `setProvider()` ಗೆ ಕರೆ ಮಾಡಿ (ಉದಾ, `@molecule/app-splash-screen-react-native` ನಿಂದ).',
}
