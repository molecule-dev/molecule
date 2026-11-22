import type { AngularTranslations } from './types.js'

/** Angular translations for Swedish. */
export const sv: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider måste användas inom en ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient måste användas inom en AuthProvider',
  'angular.error.oauthFailed': 'OAuth-inloggning misslyckades',
  'angular.error.unsupportedMethod': 'Metod som inte stöds: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider måste användas inom en StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider måste användas inom en EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient måste användas inom en HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider måste användas inom en LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider måste användas inom en PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Ingen router här. Lägg till `provideMoleculeRouter()` från routingbindningen (`@molecule/app-routing-angular-router`) till appens providers, efter Angulars `provideRouter(routes)`, eller skicka `router` till `provideMolecule`. Om appen redan gör detta är dess routingbindning äldre än denna bindning: uppdatera den (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Denna routing-bindning har ingen routad vy att rendera här: skicka sidan som underordnade istället. Om appen routar med `@molecule/app-routing-angular-router` är den bindningen äldre än denna bindning: uppdatera den (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider måste användas inom en StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider måste användas inom en ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider måste användas inom en WorkspaceProvider',
}
