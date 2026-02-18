import type { VueTranslations } from './types.js'

/** Vue translations for Catalan. */
export const ca: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    "useRouterInstance s'ha d'utilitzar dins d'un RouterProvider",
  'vue.error.useI18nOutsideProvider': "useI18nProvider s'ha d'utilitzar dins d'un I18nProvider",
  'vue.error.useStoreOutsideProvider': "useStateProvider s'ha d'utilitzar dins d'un StateProvider",
  'vue.error.useThemeOutsideProvider': "useThemeProvider s'ha d'utilitzar dins d'un ThemeProvider",
  'vue.error.useAuthOutsideProvider': "useAuthClient s'ha d'utilitzar dins d'un AuthProvider",
  'vue.error.useStorageOutsideProvider':
    "useStorageProvider s'ha d'utilitzar dins d'un StorageProvider",
  'vue.error.useHttpOutsideProvider': "useHttpClient s'ha d'utilitzar dins d'un HttpProvider",
  'vue.error.useLoggerOutsideProvider':
    "useLoggerProvider s'ha d'utilitzar dins d'un LoggerProvider",
  'vue.error.useToastOutsideProvider': "useToast s'ha d'utilitzar dins d'un ToastProvider",
  'vue.error.unsupportedMethod': 'Mètode no compatible: {{method}}',
}
