import type { VueTranslations } from './types.js'

/** Vue translations for Danish. */
export const da: VueTranslations = {
  'vue.error.useRouterOutsideProvider': 'useRouterInstance skal bruges inden for en RouterProvider',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider skal bruges inden for en I18nProvider',
  'vue.error.useStoreOutsideProvider': 'useStateProvider skal bruges inden for en StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider skal bruges inden for en ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient skal bruges inden for en AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider skal bruges inden for en StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient skal bruges inden for en HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider skal bruges inden for en LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast skal bruges inden for en ToastProvider',
  'vue.error.unsupportedMethod': 'Ikke-understøttet metode: {{method}}',
}
