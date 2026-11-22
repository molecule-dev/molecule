import type { VueTranslations } from './types.js'

/** Vue translations for ca. */
export const ca: Partial<VueTranslations> = {
  'vue.error.unsupportedMethod': 'Mètode no compatible: {{method}}',
  'vue.error.useRouterOutsideProvider':
    "Aquí no hi ha cap encaminador. Embolica l'aplicació a `MoleculeRouterProvider` des de l'enllaç d'encaminament (`@molecule/app-routing-vue-router`), o passa `router` a `moleculePlugin`.",
  'vue.error.noRoutedView':
    "Aquest enllaç d'encaminament no té cap vista encaminada per renderitzar aquí: passa la pàgina com a filla.",
  'vue.error.useStoreOutsideProvider': "useStateProvider s'ha d'utilitzar dins d'un StateProvider.",
  'vue.error.useThemeOutsideProvider': "useThemeProvider s'ha d'utilitzar dins d'un ThemeProvider.",
  'vue.error.useAuthOutsideProvider': "useAuthClient s'ha d'utilitzar dins d'un AuthProvider.",
  'vue.error.useStorageOutsideProvider':
    "useStorageProvider s'ha d'utilitzar dins d'un StorageProvider.",
  'vue.error.useHttpOutsideProvider': "useHttpClient s'ha d'utilitzar dins d'un HttpProvider.",
  'vue.error.useLoggerOutsideProvider':
    "useLoggerProvider s'ha d'utilitzar dins d'un LoggerProvider.",
  'vue.error.useToastOutsideProvider': "useToast s'ha d'utilitzar dins d'un ToastProvider.",
  'vue.error.useChatOutsideProvider': "useChatProvider s'ha d'utilitzar dins d'un ChatProvider.",
  'vue.error.useEditorOutsideProvider':
    "useEditorProvider s'ha d'utilitzar dins d'un EditorProvider.",
  'vue.error.oauthFailed': "L'inici de sessió amb OAuth ha fallat",
  'vue.error.usePreviewOutsideProvider':
    "usePreviewProvider s'ha d'utilitzar dins d'un PreviewProvider.",
  'vue.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider s'ha d'utilitzar dins d'un WorkspaceProvider.",
}
