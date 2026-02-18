import type { VueTranslations } from './types.js'

/** Vue translations for Russian. */
export const ru: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'useRouterInstance должен использоваться внутри RouterProvider',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider должен использоваться внутри I18nProvider',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider должен использоваться внутри StateProvider',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider должен использоваться внутри ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient должен использоваться внутри AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider должен использоваться внутри StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient должен использоваться внутри HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider должен использоваться внутри LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast должен использоваться внутри ToastProvider',
  'vue.error.unsupportedMethod': 'Неподдерживаемый метод: {{method}}',
}
