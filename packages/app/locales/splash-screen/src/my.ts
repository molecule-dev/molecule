import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Burmese. */
export const my: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Splash screen provider ကို ပြင်ဆင်သတ်မှတ်ထားခြင်း မရှိပါ။',
  'splashScreen.warn.configureNotSupported':
    'configure() ကို ဤ splash screen provider မှ ပံ့ပိုးမထားပါ။',
  'splashScreen.error.missingDependency':
    '`{{library}}` ကို လိုအပ်သော်လည်း ထည့်သွင်းထားခြင်း မရှိပါ။ အောက်ပါဖြင့် ထည့်သွင်းပါ- `npx expo install {{library}}`',
}
