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
    "Aucun routeur n'est configuré ici. Ajoutez `provideMoleculeRouter()` depuis la liaison de routage (`@molecule/app-routing-angular-router`) aux fournisseurs de l'application, après `provideRouter(routes)` d'Angular, ou transmettez `router` à `provideMolecule`. Si l'application le fait déjà, sa liaison de routage est plus ancienne que cette liaison : mettez-la à jour (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.noRoutedView':
    "Cette liaison de routage n'a aucune vue routée à afficher ici : transmettez plutôt la page en tant qu'enfant. Si l'application utilise `@molecule/app-routing-angular-router` pour le routage, cette liaison est plus ancienne que celle-ci : mettez-la à jour (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.useStorageOutsideProvider':
    "La méthode useStorageProvider doit être utilisée à l'intérieur d'un StorageProvider.",
  'angular.error.useThemeOutsideProvider':
    "La méthode useThemeProvider doit être utilisée à l'intérieur d'un ThemeProvider.",
  'angular.error.useWorkspaceOutsideProvider':
    "La fonction useWorkspaceProvider doit être utilisée à l'intérieur d'un WorkspaceProvider.",
}
