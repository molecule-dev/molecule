import type { VueTranslations } from './types.js'

/** Vue translations for Arabic. */
export const ar: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'لا يوجد موجّه هنا. قم بتغليف التطبيق باستخدام `MoleculeRouterProvider` من رابط التوجيه (`@molecule/app-routing-vue-router`)، أو مرّر `router` إلى `moleculePlugin`. إذا كان التطبيق يفعل ذلك بالفعل، فإن رابط التوجيه الخاص به أقدم من هذا الربط: قم بتحديثه (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'لا يحتوي هذا الربط التوجيهي على عرض مُوجَّه لعرضه هنا: مرِّر الصفحة كعناصر فرعية بدلاً من ذلك. إذا كان التطبيق يستخدم التوجيه باستخدام `@molecule/app-routing-vue-router`، فإن هذا الربط أقدم من هذا الربط: قم بتحديثه (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'يجب استخدام useStateProvider داخل StateProvider',
  'vue.error.useThemeOutsideProvider': 'يجب استخدام useThemeProvider داخل ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'يجب استخدام useAuthClient داخل AuthProvider',
  'vue.error.useStorageOutsideProvider': 'يجب استخدام useStorageProvider داخل StorageProvider',
  'vue.error.useHttpOutsideProvider': 'يجب استخدام useHttpClient داخل HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'يجب استخدام useLoggerProvider داخل LoggerProvider',
  'vue.error.useToastOutsideProvider': 'يجب استخدام useToast داخل ToastProvider',
  'vue.error.unsupportedMethod': 'طريقة غير مدعومة: {{method}}',
  'vue.error.useChatOutsideProvider': 'يجب استخدام useChatProvider داخل ChatProvider',
  'vue.error.useEditorOutsideProvider': 'يجب استخدام useEditorProvider داخل EditorProvider',
  'vue.error.oauthFailed': 'فشل تسجيل الدخول باستخدام OAuth',
  'vue.error.usePreviewOutsideProvider': 'يجب استخدام usePreviewProvider داخل PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'يجب استخدام useWorkspaceProvider داخل WorkspaceProvider',
}
