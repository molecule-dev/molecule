import type { VueTranslations } from './types.js'

/** Vue translations for it. */
export const it: Partial<VueTranslations> = {
  'vue.error.unsupportedMethod': 'Metodo non supportato: {{method}}',
  'vue.error.useRouterOutsideProvider':
    'useRouterInstance deve essere utilizzato all&#39;interno di un RouterProvider',
  'vue.error.useI18nOutsideProvider':
    'useI18nProvider deve essere utilizzato all&#39;interno di un I18nProvider',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider deve essere utilizzato all&#39;interno di uno StateProvider',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider deve essere utilizzato all&#39;interno di un ThemeProvider',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient deve essere utilizzato all&#39;interno di un AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider deve essere utilizzato all&#39;interno di uno StorageProvider',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient deve essere utilizzato all&#39;interno di un HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider deve essere utilizzato all&#39;interno di un LoggerProvider',
  'vue.error.useToastOutsideProvider':
    'useToast deve essere utilizzato all&#39;interno di un ToastProvider',
}
