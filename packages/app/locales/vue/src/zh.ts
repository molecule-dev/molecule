import type { VueTranslations } from './types.js'

/** Vue translations for Chinese. */
export const zh: VueTranslations = {
  'vue.error.useRouterOutsideProvider': 'useRouterInstance 必须在 RouterProvider 内使用',
  'vue.error.useI18nOutsideProvider': 'useI18nProvider 必须在 I18nProvider 内使用',
  'vue.error.useStoreOutsideProvider': 'useStateProvider 必须在 StateProvider 内使用',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider 必须在 ThemeProvider 内使用',
  'vue.error.useAuthOutsideProvider': 'useAuthClient 必须在 AuthProvider 内使用',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider 必须在 StorageProvider 内使用',
  'vue.error.useHttpOutsideProvider': 'useHttpClient 必须在 HttpProvider 内使用',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider 必须在 LoggerProvider 内使用',
  'vue.error.useToastOutsideProvider': 'useToast 必须在 ToastProvider 内使用',
  'vue.error.unsupportedMethod': '不支持的方法: {{method}}',
}
