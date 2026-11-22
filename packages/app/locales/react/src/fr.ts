import type { ReactTranslations } from './types.js'

/** React translations for fr. */
export const fr: Partial<ReactTranslations> = {
  'react.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
  'react.error.useAccordionOutsideProvider':
    "Les éléments d'un accordéon doivent être utilisés à l'intérieur d'un accordéon.",
  'react.error.useAuthOutsideProvider':
    "La méthode useAuthClient doit être utilisée au sein d'un AuthProvider.",
  'react.error.useChatOutsideProvider':
    "La fonction useChatProvider doit être utilisée au sein d'un ChatProvider.",
  'react.error.useEditorOutsideProvider':
    "La méthode useEditorProvider doit être utilisée à l'intérieur d'un EditorProvider.",
  'react.error.useHttpOutsideProvider':
    "La méthode useHttpClient doit être utilisée au sein d'un HttpProvider.",
  'react.error.useLoggerOutsideProvider':
    "La méthode useLoggerProvider doit être utilisée à l'intérieur d'un LoggerProvider.",
  'react.error.usePreviewOutsideProvider':
    "La méthode usePreviewProvider doit être utilisée à l'intérieur d'un PreviewProvider.",
  'react.error.useRouterOutsideProvider':
    "Aucun routeur ici. Montez un composant de routage depuis la liaison de routage de l'application (`BrowserRouter` de `@molecule/app-routing-react-router`), ou transmettez `router` à `MoleculeProvider`. Si l'application le fait déjà, sa liaison de routage est plus ancienne que cette liaison : mettez-la à jour (`npm install @molecule/app-routing-react-router@latest`).",
  'react.error.noRoutedView':
    "Cette liaison de routage n'a aucune vue routée à afficher ici : transmettez plutôt la page en tant qu'enfant. Si l'application utilise `@molecule/app-routing-react-router` pour le routage, cette liaison est plus ancienne que celle-ci : mettez-la à jour (`npm install @molecule/app-routing-react-router@latest`).",
  'react.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé à l'intérieur d'un StateProvider.",
  'react.error.useStorageOutsideProvider':
    "La méthode useStorageProvider doit être utilisée à l'intérieur d'un StorageProvider.",
  'react.error.useThemeOutsideProvider':
    "La méthode useThemeProvider doit être utilisée à l'intérieur d'un ThemeProvider.",
  'react.error.useToastOutsideProvider':
    "La méthode useToast doit être utilisée à l'intérieur d'un ToastProvider.",
  'react.error.useWorkspaceOutsideProvider':
    "La fonction useWorkspaceProvider doit être utilisée à l'intérieur d'un WorkspaceProvider.",
  'react.error.oauthFailed': 'Échec de la connexion OAuth',
}
