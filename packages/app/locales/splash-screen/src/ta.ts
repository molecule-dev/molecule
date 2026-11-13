import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Tamil. */
export const ta: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() இந்த ஸ்பிளாஷ் திரை வழங்குநரால் ஆதரிக்கப்படவில்லை.',
  'splashScreen.error.missingDependency':
    '`{{library}}` தேவைப்படுகிறது, ஆனால் நிறுவப்படவில்லை. இதை `npx expo install {{library}}` கொண்டு நிறுவவும்.',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: வழங்குநர் எதுவும் அமைக்கப்படவில்லை. `setProvider()` செயல்பாட்டை ஒரு `SplashScreenProvider` செயலாக்கத்துடன் அழைக்கவும் (எ.கா., `@molecule/app-splash-screen-react-native` இலிருந்து).',
}
