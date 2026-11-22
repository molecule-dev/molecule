import type { AngularTranslations } from './types.js'

/** Angular translations for Spanish. */
export const es: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro de un ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro de un AuthProvider.',
  'angular.error.oauthFailed': 'Falló el inicio de sesión de OAuth.',
  'angular.error.unsupportedMethod': 'Método no compatible: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider debe usarse dentro de un StateProvider.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider debe usarse dentro de un EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro de un HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider debe usarse dentro de un LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro de un PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Aquí no hay enrutador. Agregue `provideMoleculeRouter()` desde el enlace de enrutamiento (`@molecule/app-routing-angular-router`) a los proveedores de la aplicación, después de `provideRouter(routes)` de Angular, o pase `router` a `provideMolecule`.',
  'angular.error.noRoutedView':
    'Este enlace de enrutamiento no tiene ninguna vista enrutada para mostrar aquí: en su lugar, pase la página como elementos secundarios.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro de un StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider debe usarse dentro de un ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro de un WorkspaceProvider',
}
