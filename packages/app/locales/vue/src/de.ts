import type { VueTranslations } from './types.js'

/** Vue translations for German. */
export const de: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'useRouterInstance muss innerhalb eines RouterProvider verwendet werden',
  'vue.error.useI18nOutsideProvider':
    'useI18nProvider muss innerhalb eines I18nProvider verwendet werden',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider muss innerhalb eines StateProvider verwendet werden',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider muss innerhalb eines ThemeProvider verwendet werden',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient muss innerhalb eines AuthProvider verwendet werden',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider muss innerhalb eines StorageProvider verwendet werden',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient muss innerhalb eines HttpProvider verwendet werden',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider muss innerhalb eines LoggerProvider verwendet werden',
  'vue.error.useToastOutsideProvider':
    'useToast muss innerhalb eines ToastProvider verwendet werden',
  'vue.error.unsupportedMethod': 'Nicht unterstützte Methode: {{method}}',
}
