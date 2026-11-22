import type { AngularTranslations } from './types.js'

/** Angular translations for Czech. */
export const cs: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider musí být použit uvnitř ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient musí být použit v rámci AuthProvider.',
  'angular.error.oauthFailed': 'Přihlášení přes OAuth se nezdařilo',
  'angular.error.unsupportedMethod': 'Nepodporovaná metoda: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider musí být použit v rámci StateProvider.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider musí být použit uvnitř EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient musí být použit uvnitř HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider musí být použit uvnitř LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider musí být použit uvnitř PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Žádný router zde není. Přidejte `provideMoleculeRouter()` z routing bond (`@molecule/app-routing-angular-router`) k providers aplikace, za `provideRouter(routes)` z Angularu, nebo předejte `router` do `provideMolecule`. Pokud to aplikace již dělá, její routing bond je starší než tato vazba: aktualizujte ji (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Tato vazba směrování nemá žádný směrovaný pohled k vykreslení: předejte stránku jako podřízené objekty. Pokud aplikace směruje s `@molecule/app-routing-angular-router`, je tato vazba starší než tato: aktualizujte ji (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider musí být použit uvnitř StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider musí být použit uvnitř ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musí být použit uvnitř WorkspaceProvider',
}
