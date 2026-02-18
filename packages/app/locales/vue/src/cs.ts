import type { VueTranslations } from './types.js'

/** Vue translations for Czech. */
export const cs: VueTranslations = {
  'vue.error.useRouterOutsideProvider': 'useRouterInstance musí být použit uvnitř RouterProvider',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider musí být použit uvnitř I18nProvider',
  'vue.error.useStoreOutsideProvider': 'useStateProvider musí být použit uvnitř StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider musí být použit uvnitř ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient musí být použit uvnitř AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider musí být použit uvnitř StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient musí být použit uvnitř HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider musí být použit uvnitř LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast musí být použit uvnitř ToastProvider',
  'vue.error.unsupportedMethod': 'Nepodporovaná metoda: {{method}}',
}
