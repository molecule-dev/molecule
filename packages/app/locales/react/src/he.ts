import type { ReactTranslations } from './types.js'

/** React translations for Hebrew. */
export const he: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'יש להשתמש ברכיבי Accordion בתוך Accordion',
  'react.error.useAuthOutsideProvider': 'יש להשתמש ב-useAuthClient בתוך AuthProvider',
  'react.error.useChatOutsideProvider': 'יש להשתמש ב-useChatProvider בתוך ChatProvider',
  'react.error.useEditorOutsideProvider': 'יש להשתמש ב-useEditorProvider בתוך EditorProvider',
  'react.error.useHttpOutsideProvider': 'יש להשתמש ב-useHttpClient בתוך HttpProvider',
  'react.error.useLoggerOutsideProvider': 'יש להשתמש ב-useLoggerProvider בתוך LoggerProvider',
  'react.error.usePreviewOutsideProvider': 'יש להשתמש ב-usePreviewProvider בתוך PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'אין כאן נתב. יש להרכיב רכיב נתב מקשר הניתוב של האפליקציה (`BrowserRouter` מתוך `@molecule/app-routing-react-router`), או להעביר `router` ל `MoleculeProvider`. אם האפליקציה כבר עושה זאת, קשר הניתוב שלה ישן יותר מקשר זה: יש לעדכן אותו (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'לקשר הניתוב הזה אין תצוגה מנותבת לעיבוד כאן: יש להעביר את הדף כעמוד ילדים במקום זאת. אם האפליקציה מנתבת עם `@molecule/app-routing-react-router`, קשר זה ישן יותר מקישור זה: יש לעדכן אותו (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'יש להשתמש ב-useStateProvider בתוך StateProvider',
  'react.error.useStorageOutsideProvider': 'יש להשתמש ב-useStorageProvider בתוך StorageProvider',
  'react.error.useThemeOutsideProvider': 'יש להשתמש ב-useThemeProvider בתוך ThemeProvider',
  'react.error.useToastOutsideProvider': 'יש להשתמש ב-useToast בתוך ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'יש להשתמש ב-useWorkspaceProvider בתוך WorkspaceProvider',
  'react.error.unsupportedMethod': 'שיטה לא נתמכת: {{method}}',
  'react.error.oauthFailed': 'ההתחברות באמצעות OAuth נכשלה',
}
