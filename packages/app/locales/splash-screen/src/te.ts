import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Telugu. */
export const te: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ఈ స్ప్లాష్ స్క్రీన్ ప్రొవైడర్ ద్వారా మద్దతు లేదు.',
  'splashScreen.error.missingDependency':
    '`{{library}}` అవసరం, కానీ అది ఇన్‌స్టాల్ చేయబడలేదు. దీనిని ఈ కమాండ్‌తో ఇన్‌స్టాల్ చేయండి: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: ప్రొవైడర్ ఏదీ సెట్ చేయబడలేదు. `SplashScreenProvider` ఇంప్లిమెంటేషన్‌తో `setProvider()` కాల్ చేయండి (ఉదాహరణకు, `@molecule/app-splash-screen-react-native` నుండి).',
}
