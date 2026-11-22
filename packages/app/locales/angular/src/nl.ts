import type { AngularTranslations } from './types.js'

/** Angular translations for Dutch. */
export const nl: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider moet binnen een ChatProvider worden gebruikt',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient moet binnen een AuthProvider worden gebruikt.',
  'angular.error.oauthFailed': 'OAuth-aanmelding mislukt',
  'angular.error.unsupportedMethod': 'Niet-ondersteunde methode: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider moet binnen een StateProvider worden gebruikt',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider moet binnen een EditorProvider worden gebruikt',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient moet binnen een HttpProvider worden gebruikt',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider moet binnen een LoggerProvider worden gebruikt',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider moet binnen een PreviewProvider worden gebruikt',
  'angular.error.useRouterOutsideProvider':
    "Geen router hier. Voeg `provideMoleculeRouter()` van de routing bond (`@molecule/app-routing-angular-router`) toe aan de providers van de app, na Angular's `provideRouter(routes)`, of geef `router` door aan `provideMolecule`.",
  'angular.error.noRoutedView':
    'Deze routing bond heeft geen gerouteerde view om hier weer te geven: geef de pagina in plaats daarvan door als children.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider moet binnen een StorageProvider worden gebruikt',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider moet binnen een ThemeProvider worden gebruikt',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider moet binnen een WorkspaceProvider worden gebruikt',
}
