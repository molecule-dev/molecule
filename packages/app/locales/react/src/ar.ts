import type { ReactTranslations } from './types.js'

/** React translations for Arabic. */
export const ar: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'يجب استخدام مكونات Accordion داخل Accordion',
  'react.error.useAuthOutsideProvider': 'يجب استخدام useAuthClient داخل AuthProvider',
  'react.error.useChatOutsideProvider': 'يجب استخدام useChatProvider داخل ChatProvider',
  'react.error.useEditorOutsideProvider': 'يجب استخدام useEditorProvider داخل EditorProvider',
  'react.error.useHttpOutsideProvider': 'يجب استخدام useHttpClient داخل HttpProvider',
  'react.error.useLoggerOutsideProvider': 'يجب استخدام useLoggerProvider داخل LoggerProvider',
  'react.error.usePreviewOutsideProvider': 'يجب استخدام usePreviewProvider داخل PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'لا يوجد موجّه هنا. قم بتثبيت مكوّن الموجّه من رابط التوجيه الخاص بالتطبيق (`BrowserRouter` من `@molecule/app-routing-react-router`)، أو مرّر `router` إلى `MoleculeProvider`. إذا كان التطبيق يقوم بذلك بالفعل، فإن رابط التوجيه الخاص به أقدم من هذا الربط: قم بتحديثه (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'لا يحتوي هذا الربط التوجيهي على عرض مُوجَّه لعرضه هنا: مرِّر الصفحة كعناصر فرعية بدلاً من ذلك. إذا كان التطبيق يستخدم التوجيه باستخدام `@molecule/app-routing-react-router`، فإن هذا الربط أقدم من هذا الربط: قم بتحديثه (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'يجب استخدام useStateProvider داخل StateProvider',
  'react.error.useStorageOutsideProvider': 'يجب استخدام useStorageProvider داخل StorageProvider',
  'react.error.useThemeOutsideProvider': 'يجب استخدام useThemeProvider داخل ThemeProvider',
  'react.error.useToastOutsideProvider': 'يجب استخدام useToast داخل ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'يجب استخدام useWorkspaceProvider داخل WorkspaceProvider',
  'react.error.unsupportedMethod': 'طريقة غير مدعومة: {{method}}',
  'react.error.oauthFailed': 'فشل تسجيل الدخول عبر OAuth',
}
