import type { VueTranslations } from './types.js'

/** Vue translations for English. */
export const en: VueTranslations = {
  'vue.error.useRouterOutsideProvider': 'useRouterInstance must be used within a RouterProvider',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider must be used within an I18nProvider',
  'vue.error.useStoreOutsideProvider': 'useStateProvider must be used within a StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider must be used within a ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient must be used within an AuthProvider',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider must be used within a StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient must be used within an HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider must be used within a LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast must be used within a ToastProvider',
  'vue.error.unsupportedMethod': 'Unsupported method: {{method}}',
}
