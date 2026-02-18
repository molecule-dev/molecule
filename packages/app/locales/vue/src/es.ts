import type { VueTranslations } from './types.js'

/** Vue translations for Spanish. */
export const es: VueTranslations = {
  'vue.error.useRouterOutsideProvider': 'useRouterInstance debe usarse dentro de un RouterProvider',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider debe usarse dentro de un I18nProvider',
  'vue.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro de un StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro de un ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro de un AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro de un StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro de un HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider debe usarse dentro de un LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast debe usarse dentro de un ToastProvider',
  'vue.error.unsupportedMethod': 'Método no compatible: {{method}}',
}
