import type { SolidTranslations } from './types.js'

/** Solid translations for Arabic. */
export const ar: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'يجب استخدام getStateProvider داخل MoleculeProvider مع تكوين الحالة',
  'solid.error.authOutsideProvider':
    'يجب استخدام getAuthClient داخل MoleculeProvider مع تكوين المصادقة',
  'solid.error.themeOutsideProvider':
    'يجب استخدام getThemeProvider داخل MoleculeProvider مع تكوين السمة',
  'solid.error.routerOutsideProvider':
    'يجب استخدام getRouter داخل MoleculeProvider مع تكوين التوجيه',
  'solid.error.i18nOutsideProvider':
    'يجب استخدام getI18nProvider داخل MoleculeProvider مع تكوين i18n',
  'solid.error.httpOutsideProvider':
    'يجب استخدام getHttpClient داخل MoleculeProvider مع تكوين HTTP',
  'solid.error.storageOutsideProvider':
    'يجب استخدام getStorageProvider داخل MoleculeProvider مع تكوين التخزين',
  'solid.error.loggerOutsideProvider':
    'يجب استخدام getLoggerProvider داخل MoleculeProvider مع تكوين السجل',
  'solid.error.useAccordionOutsideProvider': 'يجب استخدام مكونات Accordion داخل Accordion',
  'solid.error.useToastOutsideProvider': 'يجب استخدام useToast داخل ToastProvider',
  'solid.error.useChatOutsideProvider': 'يجب استخدام useChatProvider داخل ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'يجب استخدام useWorkspaceProvider داخل WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'يجب استخدام useEditorProvider داخل EditorProvider',
  'solid.error.usePreviewOutsideProvider': 'يجب استخدام usePreviewProvider داخل PreviewProvider',
  'solid.error.useAuthOutsideProvider':
    'يجب استخدام useAuthClient داخل موفر المصادقة (AuthProvider)',
  'solid.error.useHttpOutsideProvider': 'يجب استخدام useHttpClient داخل HttpProvider',
  'solid.error.unsupportedMethod': 'طريقة غير مدعومة: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'يجب استخدام useLoggerProvider داخل LoggerProvider',
  'solid.error.oauthFailed': 'فشل تسجيل الدخول باستخدام OAuth',
  'solid.error.useRouterOutsideProvider':
    'لا يوجد موجّه هنا. استخدم `MoleculeRouterProvider` من رابط التوجيه (`@molecule/app-routing-solid-router`) كموجّه `root` ، أو مرّر `router` إلى `MoleculeProvider`. إذا كان التطبيق يستخدم هذا بالفعل، فإن رابط التوجيه الخاص به أقدم من هذا الربط: قم بتحديثه (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'لا يوجد عرض مُوجَّه هنا. يُعطي Solid Router مُكوِّن المسار مساره المُتداخل كـ `props.children`: استخدم هذا كـ `component` للمسار، أو مرِّر الصفحة كعناصر فرعية.',
  'solid.error.useStoreOutsideProvider': 'يجب استخدام useStateProvider داخل StateProvider',
  'solid.error.useStorageOutsideProvider': 'يجب استخدام useStorageProvider داخل StorageProvider',
  'solid.error.useThemeOutsideProvider': 'يجب استخدام useThemeProvider داخل ThemeProvider',
}
