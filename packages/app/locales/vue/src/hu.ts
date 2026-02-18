import type { VueTranslations } from './types.js'

/** Vue translations for Hungarian. */
export const hu: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'A useRouterInstance-t RouterProvider-en belül kell használni',
  'vue.error.useI18nOutsideProvider': 'A useI18nProvider-t I18nProvider-en belül kell használni',
  'vue.error.useStoreOutsideProvider': 'A useStateProvider-t StateProvider-en belül kell használni',
  'vue.error.useThemeOutsideProvider': 'A useThemeProvider-t ThemeProvider-en belül kell használni',
  'vue.error.useAuthOutsideProvider': 'A useAuthClient-et AuthProvider-en belül kell használni',
  'vue.error.useStorageOutsideProvider':
    'A useStorageProvider-t StorageProvider-en belül kell használni',
  'vue.error.useHttpOutsideProvider': 'A useHttpClient-et HttpProvider-en belül kell használni',
  'vue.error.useLoggerOutsideProvider':
    'A useLoggerProvider-t LoggerProvider-en belül kell használni',
  'vue.error.useToastOutsideProvider': 'A useToast-ot ToastProvider-en belül kell használni',
  'vue.error.unsupportedMethod': 'Nem támogatott metódus: {{method}}',
}
