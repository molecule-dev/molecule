import type { VueTranslations } from './types.js'

/** Vue translations for Persian. */
export const fa: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'اینجا روتری وجود ندارد. برنامه را در `MoleculeRouterProvider` از پیوند مسیریابی (`@molecule/app-routing-vue-router`) قرار دهید، یا `router` به `moleculePlugin` منتقل کنید.',
  'vue.error.noRoutedView':
    'این پیوند مسیریابی هیچ نمای مسیریابی‌شده‌ای برای رندر کردن در اینجا ندارد: در عوض، صفحه را به عنوان فرزند ارسال کنید.',
  'vue.error.useStoreOutsideProvider': 'useStateProvider باید درون StateProvider استفاده شود',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider باید درون ThemeProvider استفاده شود',
  'vue.error.useAuthOutsideProvider': 'useAuthClient باید درون AuthProvider استفاده شود',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider باید درون StorageProvider استفاده شود',
  'vue.error.useHttpOutsideProvider': 'useHttpClient باید درون HttpProvider استفاده شود',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider باید درون LoggerProvider استفاده شود',
  'vue.error.useToastOutsideProvider': 'useToast باید درون ToastProvider استفاده شود',
  'vue.error.unsupportedMethod': 'روش پشتیبانی نشده: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider باید درون ChatProvider استفاده شود',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider باید درون یک EditorProvider استفاده شود.',
  'vue.error.oauthFailed': 'ورود به سیستم OAuth ناموفق بود',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider باید درون یک PreviewProvider استفاده شود.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider باید درون یک WorkspaceProvider استفاده شود.',
}
