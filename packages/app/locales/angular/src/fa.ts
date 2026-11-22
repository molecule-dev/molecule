import type { AngularTranslations } from './types.js'

/** Angular translations for Persian. */
export const fa: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider باید درون ChatProvider استفاده شود',
  'angular.error.useAuthOutsideProvider': 'useAuthClient باید درون یک AuthProvider استفاده شود.',
  'angular.error.oauthFailed': 'ورود به سیستم OAuth ناموفق بود',
  'angular.error.unsupportedMethod': 'روش پشتیبانی نشده: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider باید درون یک StateProvider استفاده شود.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider باید درون EditorProvider استفاده شود',
  'angular.error.useHttpOutsideProvider': 'useHttpClient باید درون HttpProvider استفاده شود',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider باید درون LoggerProvider استفاده شود',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider باید درون PreviewProvider استفاده شود',
  'angular.error.useRouterOutsideProvider':
    'اینجا هیچ مسیریابی وجود ندارد. `provideMoleculeRouter()` را از پیوند مسیریابی (`@molecule/app-routing-angular-router`) به ارائه دهندگان برنامه، پس از `provideRouter(routes)` از Angular اضافه کنید، یا `router` را به `provideMolecule` منتقل کنید.',
  'angular.error.noRoutedView':
    'این پیوند مسیریابی هیچ نمای مسیریابی‌شده‌ای برای رندر کردن در اینجا ندارد: در عوض، صفحه را به عنوان فرزند ارسال کنید.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider باید درون StorageProvider استفاده شود',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider باید درون ThemeProvider استفاده شود',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider باید درون WorkspaceProvider استفاده شود',
}
