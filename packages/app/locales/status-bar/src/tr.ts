import type { StatusBarTranslations } from './types.js'

/** StatusBar translations for tr. */
export const tr: Partial<StatusBarTranslations> = {
  'statusBar.error.noProvider':
    "@molecule/app-status-bar: Sağlayıcı ayarlanmadı. Bir StatusBarProvider uygulamasıyla (örneğin, @molecule/app-status-bar-react-native'dan) setProvider() işlevini çağırın.",
}
