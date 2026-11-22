import type { AngularTranslations } from './types.js'

/** Angular translations for Albanian. */
export const sq: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider duhet të përdoret brenda një ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient duhet të përdoret brenda një AuthProvider',
  'angular.error.oauthFailed': 'Hyrja në OAuth dështoi',
  'angular.error.unsupportedMethod': 'Metodë e pambështetur: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider duhet të përdoret brenda një StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider duhet të përdoret brenda një EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient duhet të përdoret brenda një HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider duhet të përdoret brenda një LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider duhet të përdoret brenda një PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Nuk ka router këtu. Shtoni `provideMoleculeRouter()` nga lidhja e routing-ut (`@molecule/app-routing-angular-router`) te ofruesit e aplikacionit, pas `provideRouter(routes)` të Angular, ose kaloni `router` te `provideMolecule`.',
  'angular.error.noRoutedView':
    "Kjo lidhje rrugëzimi nuk ka pamje të rrugëzuar për t'u paraqitur këtu: kalojeni faqen si fëmijë në vend të kësaj.",
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider duhet të përdoret brenda një StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider duhet të përdoret brenda një ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider duhet të përdoret brenda një WorkspaceProvider',
}
