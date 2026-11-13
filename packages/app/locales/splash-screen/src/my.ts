import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Burmese. */
export const my: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ကို ဤ splash screen provider မှ ပံ့ပိုးမထားပါ။',
  'splashScreen.error.missingDependency':
    '`{{library}}` ကို လိုအပ်သော်လည်း ထည့်သွင်းထားခြင်း မရှိပါ။ အောက်ပါဖြင့် ထည့်သွင်းပါ- `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: ပံ့ပိုးပေးသူ သတ်မှတ်မထားပါ။ `SplashScreenProvider` အကောင်အထည်ဖော်မှုဖြင့် `setProvider()` ကို ခေါ်ဆိုပါ (ဥပမာ၊ `@molecule/app-splash-screen-react-native` မှ)။',
}
