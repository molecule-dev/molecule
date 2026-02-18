import type { VueTranslations } from './types.js'

/** Vue translations for Serbian. */
export const sr: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'useRouterInstance мора да се користи унутар RouterProvider',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider мора да се користи унутар I18nProvider',
  'vue.error.useStoreOutsideProvider': 'useStateProvider мора да се користи унутар StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider мора да се користи унутар ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient мора да се користи унутар AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи унутар StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient мора да се користи унутар HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи унутар LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast мора да се користи унутар ToastProvider',
  'vue.error.unsupportedMethod': 'Неподржани метод: {{method}}',
}
