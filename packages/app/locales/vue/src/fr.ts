import type { VueTranslations } from './types.js'

/** Vue translations for French. */
export const fr: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    "useRouterInstance doit être utilisé au sein d'un RouterProvider",
  'vue.error.useI18nOutsideProvider': "useI18nProvider doit être utilisé au sein d'un I18nProvider",
  'vue.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé au sein d'un StateProvider",
  'vue.error.useThemeOutsideProvider':
    "useThemeProvider doit être utilisé au sein d'un ThemeProvider",
  'vue.error.useAuthOutsideProvider': "useAuthClient doit être utilisé au sein d'un AuthProvider",
  'vue.error.useStorageOutsideProvider':
    "useStorageProvider doit être utilisé au sein d'un StorageProvider",
  'vue.error.useHttpOutsideProvider': "useHttpClient doit être utilisé au sein d'un HttpProvider",
  'vue.error.useLoggerOutsideProvider':
    "useLoggerProvider doit être utilisé au sein d'un LoggerProvider",
  'vue.error.useToastOutsideProvider': "useToast doit être utilisé au sein d'un ToastProvider",
  'vue.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
}
