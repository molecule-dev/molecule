import type { VueTranslations } from './types.js'

/** Vue translations for fr. */
export const fr: Partial<VueTranslations> = {
  'vue.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
  'vue.error.useRouterOutsideProvider':
    "Aucun routeur ici. Enveloppez l'application dans `MoleculeRouterProvider` à partir de la liaison de routage (`@molecule/app-routing-vue-router`), ou transmettez `router` à `moleculePlugin`.",
  'vue.error.noRoutedView':
    "Ce lien de routage n'a aucune vue routée à afficher ici : transmettez plutôt la page en tant qu'enfants.",
  'vue.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé à l'intérieur d'un StateProvider.",
  'vue.error.useThemeOutsideProvider':
    "La méthode useThemeProvider doit être utilisée à l'intérieur d'un ThemeProvider.",
  'vue.error.useAuthOutsideProvider':
    "La méthode useAuthClient doit être utilisée au sein d'un AuthProvider.",
  'vue.error.useStorageOutsideProvider':
    "La méthode useStorageProvider doit être utilisée à l'intérieur d'un StorageProvider.",
  'vue.error.useHttpOutsideProvider':
    "La méthode useHttpClient doit être utilisée au sein d'un HttpProvider.",
  'vue.error.useLoggerOutsideProvider':
    "La méthode useLoggerProvider doit être utilisée à l'intérieur d'un LoggerProvider.",
  'vue.error.useToastOutsideProvider':
    "La méthode useToast doit être utilisée à l'intérieur d'un ToastProvider.",
  'vue.error.useChatOutsideProvider':
    "La fonction useChatProvider doit être utilisée au sein d'un ChatProvider.",
  'vue.error.useEditorOutsideProvider':
    "La méthode useEditorProvider doit être utilisée à l'intérieur d'un EditorProvider.",
  'vue.error.oauthFailed': 'Échec de la connexion OAuth',
  'vue.error.usePreviewOutsideProvider':
    "La méthode usePreviewProvider doit être utilisée à l'intérieur d'un PreviewProvider.",
  'vue.error.useWorkspaceOutsideProvider':
    "La fonction useWorkspaceProvider doit être utilisée à l'intérieur d'un WorkspaceProvider.",
}
