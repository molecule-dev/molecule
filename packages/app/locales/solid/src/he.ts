import type { SolidTranslations } from './types.js'

/** Solid translations for Hebrew. */
export const he: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider יש להשתמש בתוך MoleculeProvider עם מצב מוגדר',
  'solid.error.authOutsideProvider': 'getAuthClient יש להשתמש בתוך MoleculeProvider עם אימות מוגדר',
  'solid.error.themeOutsideProvider':
    'getThemeProvider יש להשתמש בתוך MoleculeProvider עם ערכת נושא מוגדרת',
  'solid.error.routerOutsideProvider': 'getRouter יש להשתמש בתוך MoleculeProvider עם נתב מוגדר',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider יש להשתמש בתוך MoleculeProvider עם i18n מוגדר',
  'solid.error.httpOutsideProvider': 'getHttpClient יש להשתמש בתוך MoleculeProvider עם HTTP מוגדר',
  'solid.error.storageOutsideProvider':
    'getStorageProvider יש להשתמש בתוך MoleculeProvider עם אחסון מוגדר',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider יש להשתמש בתוך MoleculeProvider עם רישום מוגדר',
  'solid.error.useAccordionOutsideProvider': 'רכיבי Accordion חייבים לשמש בתוך Accordion',
  'solid.error.useToastOutsideProvider': 'useToast יש להשתמש בתוך ToastProvider',
}
