import type { AngularTranslations } from './types.js'

/** Angular translations for Norwegian Bokmål. */
export const nb: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider må brukes innenfor en ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient må brukes i en AuthProvider',
  'angular.error.oauthFailed': 'OAuth-pålogging mislyktes',
  'angular.error.unsupportedMethod': 'Metode som ikke støttes: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider må brukes i en StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider må brukes innenfor en EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient må brukes innenfor en HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider må brukes innenfor en LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider må brukes innenfor en PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Ingen ruter her. Legg til `provideMoleculeRouter()` fra rutingsbindingen (`@molecule/app-routing-angular-router`) til appens leverandører, etter Angulars `provideRouter(routes)`, eller send `router` til `provideMolecule`.',
  'angular.error.noRoutedView':
    'Denne rutingsbindingen har ingen rutet visning å gjengi her: send siden som underordnede i stedet.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider må brukes innenfor en StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider må brukes innenfor en ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider må brukes innenfor en WorkspaceProvider',
}
