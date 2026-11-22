import type { AngularTranslations } from './types.js'

/** Angular translations for ca. */
export const ca: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    "useChatProvider s'ha d'utilitzar dins d'un ChatProvider.",
  'angular.error.useAuthOutsideProvider': "useAuthClient s'ha d'utilitzar dins d'un AuthProvider.",
  'angular.error.oauthFailed': "L'inici de sessió amb OAuth ha fallat",
  'angular.error.unsupportedMethod': 'Mètode no compatible: {{method}}',
  'angular.error.useStoreOutsideProvider':
    "useStateProvider s'ha d'utilitzar dins d'un StateProvider.",

  'angular.error.useEditorOutsideProvider':
    "useEditorProvider s'ha d'utilitzar dins d'un EditorProvider.",
  'angular.error.useHttpOutsideProvider': "useHttpClient s'ha d'utilitzar dins d'un HttpProvider.",
  'angular.error.useLoggerOutsideProvider':
    "useLoggerProvider s'ha d'utilitzar dins d'un LoggerProvider.",
  'angular.error.usePreviewOutsideProvider':
    "usePreviewProvider s'ha d'utilitzar dins d'un PreviewProvider.",
  'angular.error.useRouterOutsideProvider':
    "Aquí no hi ha cap encaminador. Afegiu `provideMoleculeRouter()` des de l'enllaç d'encaminament (`@molecule/app-routing-angular-router`) als proveïdors de l'aplicació, després de `provideRouter(routes)` d'Angular, o passeu `router` a `provideMolecule`.",
  'angular.error.noRoutedView':
    "Aquest enllaç d'encaminament no té cap vista encaminada per renderitzar aquí: passa la pàgina com a filla.",
  'angular.error.useStorageOutsideProvider':
    "useStorageProvider s'ha d'utilitzar dins d'un StorageProvider.",
  'angular.error.useThemeOutsideProvider':
    "useThemeProvider s'ha d'utilitzar dins d'un ThemeProvider.",
  'angular.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider s'ha d'utilitzar dins d'un WorkspaceProvider.",
}
