import type { AngularTranslations } from './types.js'

/** Angular translations for Arabic. */
export const ar: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'يجب استخدام useChatProvider داخل ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'يجب استخدام useAuthClient داخل موفر المصادقة (AuthProvider)',
  'angular.error.oauthFailed': 'فشل تسجيل الدخول باستخدام OAuth',
  'angular.error.unsupportedMethod': 'طريقة غير مدعومة: {{method}}',
  'angular.error.useStoreOutsideProvider': 'يجب استخدام useStateProvider داخل StateProvider',

  'angular.error.useEditorOutsideProvider': 'يجب استخدام useEditorProvider داخل EditorProvider',
  'angular.error.useHttpOutsideProvider': 'يجب استخدام useHttpClient داخل HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'يجب استخدام useLoggerProvider داخل LoggerProvider',
  'angular.error.usePreviewOutsideProvider': 'يجب استخدام usePreviewProvider داخل PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'لا يوجد موجّه هنا. أضف `provideMoleculeRouter()` من رابط التوجيه (`@molecule/app-routing-angular-router`) إلى مزوّدي التطبيق، بعد `provideRouter(routes)` في Angular، أو مرّر `router` إلى `provideMolecule`. إذا كان التطبيق يفعل ذلك بالفعل، فإن رابط التوجيه الخاص به أقدم من هذا الربط: قم بتحديثه (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'لا يحتوي هذا الربط التوجيهي على عرض مُوجَّه لعرضه هنا: مرِّر الصفحة كعناصر فرعية بدلاً من ذلك. إذا كان التطبيق يستخدم التوجيه باستخدام `@molecule/app-routing-angular-router` ، فإن هذا الربط أقدم من هذا الربط: قم بتحديثه (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider': 'يجب استخدام useStorageProvider داخل StorageProvider',
  'angular.error.useThemeOutsideProvider': 'يجب استخدام useThemeProvider داخل ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'يجب استخدام useWorkspaceProvider داخل WorkspaceProvider',
}
