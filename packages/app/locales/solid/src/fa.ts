import type { SolidTranslations } from './types.js'

/** Solid translations for Persian. */
export const fa: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود وضعیت',
  'solid.error.authOutsideProvider':
    'getAuthClient باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود احراز هویت',
  'solid.error.themeOutsideProvider':
    'getThemeProvider باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود تم',
  'solid.error.routerOutsideProvider':
    'getRouter باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود مسیریاب',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود ذخیره‌سازی',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider باید درون یک MoleculeProvider با پیکربندی‌شده استفاده شود ثبت‌کننده',
  'solid.error.useAccordionOutsideProvider':
    'کامپوننت‌های Accordion باید درون یک Accordion استفاده شوند',
  'solid.error.useToastOutsideProvider': 'useToast باید درون یک ToastProvider استفاده شود',
  'solid.error.useChatOutsideProvider': 'useChatProvider باید درون ChatProvider استفاده شود',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider باید درون یک WorkspaceProvider استفاده شود.',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider باید درون یک EditorProvider استفاده شود.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider باید درون یک PreviewProvider استفاده شود.',
  'solid.error.useAuthOutsideProvider': 'useAuthClient باید درون یک AuthProvider استفاده شود.',
  'solid.error.useHttpOutsideProvider': 'useHttpClient باید درون یک HttpProvider استفاده شود.',
  'solid.error.unsupportedMethod': 'روش پشتیبانی نشده: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider باید درون یک LoggerProvider استفاده شود.',
  'solid.error.oauthFailed': 'ورود به سیستم OAuth ناموفق بود',
  'solid.error.useRouterOutsideProvider':
    'اینجا هیچ روتری وجود ندارد. از `MoleculeRouterProvider` از پیوند مسیریابی (`@molecule/app-routing-solid-router`) به عنوان `root` روتر استفاده کنید، یا `router` به `MoleculeProvider` منتقل کنید. اگر برنامه از قبل این کار را انجام می‌دهد، پیوند مسیریابی آن قدیمی‌تر از این اتصال است: آن را به‌روزرسانی کنید (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'اینجا نمای مسیریابی‌شده‌ای وجود ندارد. Solid Router به کامپوننت مسیر، مسیر تودرتوی خود را به صورت `props.children` می‌دهد: از این به عنوان `component` مسیر استفاده کنید، یا صفحه را به عنوان فرزند ارسال کنید.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider باید درون یک StateProvider استفاده شود.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider باید درون یک StorageProvider استفاده شود.',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider باید درون یک ThemeProvider استفاده شود.',
}
