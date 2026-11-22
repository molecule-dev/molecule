import type { AngularTranslations } from './types.js'

/** Angular translations for fr. */
export const fr: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    "La fonction useChatProvider doit être utilisée au sein d'un ChatProvider.",
  'angular.error.useAuthOutsideProvider':
    "La méthode useAuthClient doit être utilisée au sein d'un AuthProvider.",
  'angular.error.oauthFailed': 'Échec de la connexion OAuth',
  'angular.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
  'angular.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé à l'intérieur d'un StateProvider.",

  'angular.error.useEditorOutsideProvider':
    "La méthode useEditorProvider doit être utilisée à l'intérieur d'un EditorProvider.",
  'angular.error.useHttpOutsideProvider':
    "La méthode useHttpClient doit être utilisée au sein d'un HttpProvider.",
  'angular.error.useLoggerOutsideProvider':
    "La méthode useLoggerProvider doit être utilisée à l'intérieur d'un LoggerProvider.",
  'angular.error.usePreviewOutsideProvider':
    "La méthode usePreviewProvider doit être utilisée à l'intérieur d'un PreviewProvider.",
  'angular.error.useRouterOutsideProvider':
    "Aucun routeur ici. Ajoutez `provideMoleculeRouter()` depuis le lien de routage (`@molecule/app-routing-angular-router`) aux fournisseurs de l'application, après `provideRouter(routes)` d'Angular, ou passez `router` à `provideMolecule`.",
  'angular.error.noRoutedView':
    "Ce lien de routage n'a aucune vue routée à afficher ici : transmettez plutôt la page en tant qu'enfants.",
  'angular.error.useStorageOutsideProvider':
    "La méthode useStorageProvider doit être utilisée à l'intérieur d'un StorageProvider.",
  'angular.error.useThemeOutsideProvider':
    "La méthode useThemeProvider doit être utilisée à l'intérieur d'un ThemeProvider.",
  'angular.error.useWorkspaceOutsideProvider':
    "La fonction useWorkspaceProvider doit être utilisée à l'intérieur d'un WorkspaceProvider.",
}
