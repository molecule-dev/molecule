import type { VueTranslations } from './types.js'

/** Vue translations for fr. */
export const fr: Partial<VueTranslations> = {
  'vue.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
  'vue.error.useRouterOutsideProvider':
    "La méthode useRouterInstance doit être utilisée au sein d'un RouterProvider.",
  'vue.error.useI18nOutsideProvider':
    "La fonction useI18nProvider doit être utilisée à l'intérieur d'un I18nProvider.",
  'vue.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé à l'intérieur d'un StateProvider.",
  'vue.error.useThemeOutsideProvider':
    "La méthode useThemeProvider doit être utilisée à l'intérieur d'un ThemeProvider.",
  'vue.error.useAuthOutsideProvider':
    "La méthode useAuthClient doit être utilisée au sein d'un AuthProvider.",
  'vue.error.useStorageOutsideProvider':
    "La méthode useStorageProvider doit être utilisée à l'intérieur d'un StorageProvider.",
  'vue.error.useHttpOutsideProvider':
    "La méthode useHttpClient doit être utilisée au sein d'un HttpProvider.",
  'vue.error.useLoggerOutsideProvider':
    "La méthode useLoggerProvider doit être utilisée à l'intérieur d'un LoggerProvider.",
  'vue.error.useToastOutsideProvider':
    "La méthode useToast doit être utilisée à l'intérieur d'un ToastProvider.",
}
