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
}
