import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Telugu. */
export const te: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'స్ప్లాష్ స్క్రీన్ ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు.',
  'splashScreen.warn.configureNotSupported':
    'configure() ఈ స్ప్లాష్ స్క్రీన్ ప్రొవైడర్ ద్వారా మద్దతు లేదు.',
  'splashScreen.error.missingDependency':
    '`{{library}}` అవసరం, కానీ అది ఇన్‌స్టాల్ చేయబడలేదు. దీనిని ఈ కమాండ్‌తో ఇన్‌స్టాల్ చేయండి: `npx expo install {{library}}`',
}
