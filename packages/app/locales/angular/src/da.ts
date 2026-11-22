import type { AngularTranslations } from './types.js'

/** Angular translations for Danish. */
export const da: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider skal bruges inden for en ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient skal bruges inden for en AuthProvider',
  'angular.error.oauthFailed': 'OAuth-login mislykkedes',
  'angular.error.unsupportedMethod': 'Ikke-understøttet metode: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider skal bruges inden for en StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider skal bruges inden for en EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient skal bruges inden for en HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider skal bruges inden for en LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider skal bruges inden for en PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Ingen router her. Tilføj `provideMoleculeRouter()` fra routingbindingen (`@molecule/app-routing-angular-router`) til appens providere efter Angulars `provideRouter(routes)`, eller send `router` til `provideMolecule`. Hvis appen allerede gør dette, er dens routingbinding ældre end denne binding: opdater den (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Denne routing-binding har ingen routed view at gengive her: send i stedet siden som underordnede. Hvis appen routerer med `@molecule/app-routing-angular-router`, er den binding ældre end denne binding: opdater den (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider skal bruges inden for en StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider skal bruges inden for en ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider skal bruges inden for en WorkspaceProvider',
}
