import type { SplashScreenTranslations } from './types.js'

/** SplashScreen translations for ig. */
export const ig: Partial<SplashScreenTranslations> = {
  'splashScreen.warn.configureNotSupported': 'onye na-enye ihe ngosi a anaghị akwado nhazi().',
  'splashScreen.error.missingDependency':
    'A chọrọ `{{library}}` mana etinyereghị ya. Wụnye ya na: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Enweghị onye na-enye ọrụ. Kpọọ `setProvider()` site na iji `SplashScreenProvider` (dịka ọmụmaatụ, site na `@molecule/app-splash-screen-react-native`).',
}
