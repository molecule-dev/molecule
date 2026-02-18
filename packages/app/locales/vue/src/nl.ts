import type { VueTranslations } from './types.js'

/** Vue translations for Dutch. */
export const nl: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'useRouterInstance moet binnen een RouterProvider worden gebruikt',
  'vue.error.useI18nOutsideProvider':
    'useI18nProvider moet binnen een I18nProvider worden gebruikt',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider moet binnen een StateProvider worden gebruikt',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider moet binnen een ThemeProvider worden gebruikt',
  'vue.error.useAuthOutsideProvider': 'useAuthClient moet binnen een AuthProvider worden gebruikt',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider moet binnen een StorageProvider worden gebruikt',
  'vue.error.useHttpOutsideProvider': 'useHttpClient moet binnen een HttpProvider worden gebruikt',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider moet binnen een LoggerProvider worden gebruikt',
  'vue.error.useToastOutsideProvider': 'useToast moet binnen een ToastProvider worden gebruikt',
  'vue.error.unsupportedMethod': 'Niet-ondersteunde methode: {{method}}',
}
