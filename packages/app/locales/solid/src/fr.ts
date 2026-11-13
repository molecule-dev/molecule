import type { SolidTranslations } from './types.js'

/** Solid translations for fr. */
export const fr: Partial<SolidTranslations> = {
  'solid.error.themeOutsideProvider':
    'getThemeProvider doit être utilisé dans un MoleculeProvider avec le thème configuré',
  'solid.error.routerOutsideProvider':
    'getRouter doit être utilisé dans un MoleculeProvider avec le routeur configuré',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider doit être utilisé dans un MoleculeProvider avec i18n configuré',
  'solid.error.httpOutsideProvider':
    'getHttpClient doit être utilisé dans un MoleculeProvider avec HTTP configuré',
  'solid.error.storageOutsideProvider':
    'getStorageProvider doit être utilisé dans un MoleculeProvider avec le stockage configuré',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider doit être utilisé dans un MoleculeProvider avec la journalisation configurée',
  'solid.error.useAccordionOutsideProvider':
    'Les composants Accordion doivent être utilisés dans un Accordion',
  'solid.error.useToastOutsideProvider': 'useToast doit être utilisé dans un ToastProvider',
  'solid.error.stateOutsideProvider':
    "La méthode getStateProvider doit être utilisée au sein d'un MoleculeProvider dont l'état est configuré.",
  'solid.error.authOutsideProvider':
    "La méthode getAuthClient doit être utilisée au sein d'un MoleculeProvider avec l'authentification configurée.",
  'solid.error.useChatOutsideProvider':
    "La fonction useChatProvider doit être utilisée au sein d'un ChatProvider.",
  'solid.error.useWorkspaceOutsideProvider':
    "La fonction useWorkspaceProvider doit être utilisée à l'intérieur d'un WorkspaceProvider.",
  'solid.error.useEditorOutsideProvider':
    "La méthode useEditorProvider doit être utilisée à l'intérieur d'un EditorProvider.",
  'solid.error.usePreviewOutsideProvider':
    "La méthode usePreviewProvider doit être utilisée à l'intérieur d'un PreviewProvider.",
  'solid.error.useAuthOutsideProvider':
    "La méthode useAuthClient doit être utilisée au sein d'un AuthProvider.",
  'solid.error.useHttpOutsideProvider':
    "La méthode useHttpClient doit être utilisée au sein d'un HttpProvider.",
  'solid.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
  'solid.error.useLoggerOutsideProvider':
    "La méthode useLoggerProvider doit être utilisée à l'intérieur d'un LoggerProvider.",
  'solid.error.oauthFailed': 'Échec de la connexion OAuth',
  'solid.error.useRouterOutsideProvider':
    "La méthode useRouterInstance doit être utilisée au sein d'un RouterProvider.",
  'solid.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé à l'intérieur d'un StateProvider.",
  'solid.error.useStorageOutsideProvider':
    "La méthode useStorageProvider doit être utilisée à l'intérieur d'un StorageProvider.",
  'solid.error.useThemeOutsideProvider':
    "La méthode useThemeProvider doit être utilisée à l'intérieur d'un ThemeProvider.",
}
