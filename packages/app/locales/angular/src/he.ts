import type { AngularTranslations } from './types.js'

/** Angular translations for Hebrew. */
export const he: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'יש להשתמש ב-useChatProvider בתוך ChatProvider',
  'angular.error.useAuthOutsideProvider': 'יש להשתמש ב-useAuthClient בתוך ספק אימות',
  'angular.error.oauthFailed': 'כניסה ל-OAuth נכשלה',
  'angular.error.unsupportedMethod': 'שיטה לא נתמכת: {{method}}',
  'angular.error.useStoreOutsideProvider': 'יש להשתמש ב-useStateProvider בתוך StateProvider',

  'angular.error.useEditorOutsideProvider': 'יש להשתמש ב-useEditorProvider בתוך EditorProvider',
  'angular.error.useHttpOutsideProvider': 'יש להשתמש ב-useHttpClient בתוך HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'יש להשתמש ב-useLoggerProvider בתוך LoggerProvider',
  'angular.error.usePreviewOutsideProvider': 'יש להשתמש ב-usePreviewProvider בתוך PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'אין כאן נתב. הוסף `provideMoleculeRouter()` מקשר הניתוב (`@molecule/app-routing-angular-router`) לספקי האפליקציה, אחרי `provideRouter(routes)` של Angular, או העבר `router` ל `provideMolecule`.',
  'angular.error.noRoutedView':
    'לקשר הניתוב הזה אין תצוגה מנותבת לעיבוד כאן: העבירו את הדף כצאצאים במקום זאת.',
  'angular.error.useStorageOutsideProvider': 'יש להשתמש ב-useStorageProvider בתוך StorageProvider',
  'angular.error.useThemeOutsideProvider': 'יש להשתמש ב-useThemeProvider בתוך ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'יש להשתמש ב-useWorkspaceProvider בתוך WorkspaceProvider',
}
