import type { ReactTranslations } from './types.js'

/** React translations for Persian. */
export const fa: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'کامپوننت‌های Accordion باید درون Accordion استفاده شوند',
  'react.error.useAuthOutsideProvider': 'useAuthClient باید درون AuthProvider استفاده شود',
  'react.error.useChatOutsideProvider': 'useChatProvider باید درون ChatProvider استفاده شود',
  'react.error.useEditorOutsideProvider': 'useEditorProvider باید درون EditorProvider استفاده شود',
  'react.error.useHttpOutsideProvider': 'useHttpClient باید درون HttpProvider استفاده شود',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider باید درون LoggerProvider استفاده شود',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider باید درون PreviewProvider استفاده شود',
  'react.error.useRouterOutsideProvider':
    'اینجا هیچ روتری وجود ندارد. یک کامپوننت روتر را از پیوند مسیریابی برنامه (`BrowserRouter` از `@molecule/app-routing-react-router`) نصب کنید، یا `router` به `MoleculeProvider` منتقل کنید.',
  'react.error.noRoutedView':
    'این پیوند مسیریابی هیچ نمای مسیریابی‌شده‌ای برای رندر کردن در اینجا ندارد: در عوض، صفحه را به عنوان فرزند ارسال کنید.',
  'react.error.useStoreOutsideProvider': 'useStateProvider باید درون StateProvider استفاده شود',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider باید درون StorageProvider استفاده شود',
  'react.error.useThemeOutsideProvider': 'useThemeProvider باید درون ThemeProvider استفاده شود',
  'react.error.useToastOutsideProvider': 'useToast باید درون ToastProvider استفاده شود',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider باید درون WorkspaceProvider استفاده شود',
  'react.error.unsupportedMethod': 'روش پشتیبانی‌نشده: {{method}}',
  'react.error.oauthFailed': 'ورود با OAuth ناموفق بود',
}
