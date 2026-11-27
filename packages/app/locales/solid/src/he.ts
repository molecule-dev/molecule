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
  'solid.error.useChatOutsideProvider': 'יש להשתמש ב-useChatProvider בתוך ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'יש להשתמש ב-useWorkspaceProvider בתוך WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'יש להשתמש ב-useEditorProvider בתוך EditorProvider',
  'solid.error.usePreviewOutsideProvider': 'יש להשתמש ב-usePreviewProvider בתוך PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'יש להשתמש ב-useAuthClient בתוך ספק אימות',
  'solid.error.useHttpOutsideProvider': 'יש להשתמש ב-useHttpClient בתוך HttpProvider',
  'solid.error.unsupportedMethod': 'שיטה לא נתמכת: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'יש להשתמש ב-useLoggerProvider בתוך LoggerProvider',
  'solid.error.oauthFailed': 'כניסה ל-OAuth נכשלה',
  'solid.error.useRouterOutsideProvider':
    'אין כאן נתב. השתמש ב-`MoleculeRouterProvider` מקשר הניתוב (`@molecule/app-routing-solid-router`) כ-`root` של הנתב, או העביר `router` ל-`MoleculeProvider`. אם האפליקציה כבר עושה זאת, קשר הניתוב שלה ישן יותר מקשר זה: עדכן אותו (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'אין כאן תצוגה מנותבת. Solid Router נותן לרכיב של נתיב את הנתיב המקונן שלו כ-`props.children`: השתמש בזה כ-`component` של נתיב, או העביר את הדף כצאצאים.',
  'solid.error.useStoreOutsideProvider': 'יש להשתמש ב-useStateProvider בתוך StateProvider',
  'solid.error.useStorageOutsideProvider': 'יש להשתמש ב-useStorageProvider בתוך StorageProvider',
  'solid.error.useThemeOutsideProvider': 'יש להשתמש ב-useThemeProvider בתוך ThemeProvider',
}
