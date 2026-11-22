import type { AngularTranslations } from './types.js'

/** Angular translations for German. */
export const de: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider muss innerhalb eines ChatProvider verwendet werden',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient muss innerhalb eines AuthProviders verwendet werden.',
  'angular.error.oauthFailed': 'OAuth-Anmeldung fehlgeschlagen',
  'angular.error.unsupportedMethod': 'Nicht unterstützte Methode: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider muss innerhalb eines StateProviders verwendet werden.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider muss innerhalb eines EditorProvider verwendet werden',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient muss innerhalb eines HttpProvider verwendet werden',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider muss innerhalb eines LoggerProvider verwendet werden',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider muss innerhalb eines PreviewProvider verwendet werden',
  'angular.error.useRouterOutsideProvider':
    'Hier gibt es keinen Router. Fügen Sie `provideMoleculeRouter()` aus dem Routing-Bond (`@molecule/app-routing-angular-router`) zu den Providern der App hinzu, nach Angulars `provideRouter(routes)`, oder übergeben Sie `router` an `provideMolecule`.',
  'angular.error.noRoutedView':
    'Dieser Routing-Bond hat keine geroutete Ansicht, die hier gerendert werden kann: Übergeben Sie die Seite stattdessen als Kindseite.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider muss innerhalb eines StorageProvider verwendet werden',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider muss innerhalb eines ThemeProvider verwendet werden',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider muss innerhalb eines WorkspaceProvider verwendet werden',
}
