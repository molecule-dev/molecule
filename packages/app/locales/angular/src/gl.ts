import type { AngularTranslations } from './types.js'

/** Angular translations for Galician. */
export const gl: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro dun ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro dun AuthProvider',
  'angular.error.oauthFailed': 'Fallou o inicio de sesión con OAuth',
  'angular.error.unsupportedMethod': 'Método non compatible: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro dun StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider debe usarse dentro dun EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro dun HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider debe usarse dentro dun LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro dun PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Aquí non hai ningún enrutador. Engade `provideMoleculeRouter()` desde o enlace de enrutamento (`@molecule/app-routing-angular-router`) aos provedores da aplicación, despois de `provideRouter(routes)` de Angular, ou pasa `router` a `provideMolecule`. Se a aplicación xa fai isto, o seu enlace de enrutamento é máis antigo que este enlace: actualízao (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Este enlace de enrutamento non ten unha vista enrutada para renderizar aquí: pásase a páxina como filla no seu lugar. Se a aplicación enruta con `@molecule/app-routing-angular-router`, ese enlace é máis antigo que este enlace: actualízao (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro dun StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro dun ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro dun WorkspaceProvider',
}
