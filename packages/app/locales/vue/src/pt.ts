import type { VueTranslations } from './types.js'

/** Vue translations for Portuguese. */
export const pt: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'useRouterInstance deve ser usado dentro de um RouterProvider',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider deve ser usado dentro de um I18nProvider',
  'vue.error.useStoreOutsideProvider': 'useStateProvider deve ser usado dentro de um StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider deve ser usado dentro de um ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient deve ser usado dentro de um AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider deve ser usado dentro de um StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient deve ser usado dentro de um HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider deve ser usado dentro de um LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast deve ser usado dentro de um ToastProvider',
  'vue.error.unsupportedMethod': 'M\u00e9todo n\u00e3o suportado: {{method}}',
}
