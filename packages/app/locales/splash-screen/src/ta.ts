import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Tamil. */
export const ta: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'ஸ்பிளாஷ் திரை வழங்குநர் கட்டமைக்கப்படவில்லை.',
  'splashScreen.warn.configureNotSupported':
    'configure() இந்த ஸ்பிளாஷ் திரை வழங்குநரால் ஆதரிக்கப்படவில்லை.',
  'splashScreen.error.missingDependency':
    '`{{library}}` தேவைப்படுகிறது, ஆனால் நிறுவப்படவில்லை. இதை `npx expo install {{library}}` கொண்டு நிறுவவும்.',
}
