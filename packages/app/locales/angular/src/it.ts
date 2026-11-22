import type { AngularTranslations } from './types.js'

/** Angular translations for it. */
export const it: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    "useChatProvider deve essere utilizzato all'interno di un ChatProvider",
  'angular.error.useAuthOutsideProvider':
    "useAuthClient deve essere utilizzato all'interno di un AuthProvider",
  'angular.error.oauthFailed': 'Accesso OAuth non riuscito',
  'angular.error.unsupportedMethod': 'Metodo non supportato: {{method}}',
  'angular.error.useStoreOutsideProvider':
    "useStateProvider deve essere utilizzato all'interno di uno StateProvider",

  'angular.error.useEditorOutsideProvider':
    "useEditorProvider deve essere utilizzato all'interno di un EditorProvider",
  'angular.error.useHttpOutsideProvider':
    "useHttpClient deve essere utilizzato all'interno di un HttpProvider",
  'angular.error.useLoggerOutsideProvider':
    "useLoggerProvider deve essere utilizzato all'interno di un LoggerProvider",
  'angular.error.usePreviewOutsideProvider':
    "usePreviewProvider deve essere utilizzato all'interno di un PreviewProvider",
  'angular.error.useRouterOutsideProvider':
    "Nessun router qui. Aggiungi `provideMoleculeRouter()` dal binding di routing (`@molecule/app-routing-angular-router`) ai provider dell'app, dopo `provideRouter(routes)` di Angular, oppure passa `router` a `provideMolecule`.",
  'angular.error.noRoutedView':
    'Questo collegamento di routing non ha una vista instradata da visualizzare qui: passa invece la pagina come elemento figlio.',
  'angular.error.useStorageOutsideProvider':
    "useStorageProvider deve essere utilizzato all'interno di uno StorageProvider",
  'angular.error.useThemeOutsideProvider':
    "useThemeProvider deve essere utilizzato all'interno di un ThemeProvider",
  'angular.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider deve essere utilizzato all'interno di un WorkspaceProvider",
}
