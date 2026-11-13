import type { SplashScreenTranslations } from './types.js'

/** SplashScreen translations for cy. */
export const cy: Partial<SplashScreenTranslations> = {
  'splashScreen.warn.configureNotSupported':
    'Nid yw configure() yn cael ei gefnogi gan y darparwr sgrin groeso hwn.',
  'splashScreen.error.missingDependency':
    "Mae angen `{{library}}` ond nid yw wedi'i osod. Gosodwch ef gyda: `npx expo install {{library}}`",
  'splashScreen.error.noProvider':
    "`@molecule/app-splash-screen`: Dim darparwr wedi'i osod. Ffoniwch `setProvider()` gyda gweithrediad `SplashScreenProvider` (e.e., o `@molecule/app-splash-screen-react-native`).",
}
