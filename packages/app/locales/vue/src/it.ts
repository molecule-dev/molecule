import type { VueTranslations } from './types.js'

/** Vue translations for it. */
export const it: Partial<VueTranslations> = {
  'vue.error.unsupportedMethod': 'Metodo non supportato: {{method}}',
  'vue.error.useRouterOutsideProvider':
    "useRouterInstance deve essere utilizzato all'interno di un RouterProvider",
  'vue.error.useStoreOutsideProvider':
    "useStateProvider deve essere utilizzato all'interno di uno StateProvider",
  'vue.error.useThemeOutsideProvider':
    "useThemeProvider deve essere utilizzato all'interno di un ThemeProvider",
  'vue.error.useAuthOutsideProvider':
    "useAuthClient deve essere utilizzato all'interno di un AuthProvider",
  'vue.error.useStorageOutsideProvider':
    "useStorageProvider deve essere utilizzato all'interno di uno StorageProvider",
  'vue.error.useHttpOutsideProvider':
    "useHttpClient deve essere utilizzato all'interno di un HttpProvider",
  'vue.error.useLoggerOutsideProvider':
    "useLoggerProvider deve essere utilizzato all'interno di un LoggerProvider",
  'vue.error.useToastOutsideProvider':
    "useToast deve essere utilizzato all'interno di un ToastProvider",
  'vue.error.useChatOutsideProvider':
    "useChatProvider deve essere utilizzato all'interno di un ChatProvider",
  'vue.error.useEditorOutsideProvider':
    "useEditorProvider deve essere utilizzato all'interno di un EditorProvider",
  'vue.error.oauthFailed': 'Accesso OAuth non riuscito',
  'vue.error.usePreviewOutsideProvider':
    "usePreviewProvider deve essere utilizzato all'interno di un PreviewProvider",
  'vue.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider deve essere utilizzato all'interno di un WorkspaceProvider",
}
