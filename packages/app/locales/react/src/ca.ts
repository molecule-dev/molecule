import type { ReactTranslations } from './types.js'

/** React translations for ca. */
export const ca: Partial<ReactTranslations> = {
  'react.error.unsupportedMethod': 'Mètode no compatible: {{method}}',
  'react.error.useAccordionOutsideProvider':
    "Els components de l'acordió s'han d'utilitzar dins d'un acordió.",
  'react.error.useAuthOutsideProvider': "useAuthClient s'ha d'utilitzar dins d'un AuthProvider.",
  'react.error.useChatOutsideProvider': "useChatProvider s'ha d'utilitzar dins d'un ChatProvider.",
  'react.error.useEditorOutsideProvider':
    "useEditorProvider s'ha d'utilitzar dins d'un EditorProvider.",
  'react.error.useHttpOutsideProvider': "useHttpClient s'ha d'utilitzar dins d'un HttpProvider.",
  'react.error.useLoggerOutsideProvider':
    "useLoggerProvider s'ha d'utilitzar dins d'un LoggerProvider.",
  'react.error.usePreviewOutsideProvider':
    "usePreviewProvider s'ha d'utilitzar dins d'un PreviewProvider.",
  'react.error.useRouterOutsideProvider':
    "Aquí no hi ha cap encaminador. Munta un component d'encaminador des de l'enllaç d'encaminament de l'aplicació (`BrowserRouter` des de `@molecule/app-routing-react-router`), o passa `router` a `MoleculeProvider`. Si l'aplicació ja ho fa, el seu enllaç d'encaminament és més antic que aquest enllaç: actualitza'l (`npm install @molecule/app-routing-react-router@latest`).",
  'react.error.noRoutedView':
    "Aquest enllaç d'encaminament no té cap vista encaminada per renderitzar aquí: passeu la pàgina com a filla. Si l'aplicació encamina amb `@molecule/app-routing-react-router`, aquest enllaç és més antic que aquest enllaç: actualitzeu-lo (`npm install @molecule/app-routing-react-router@latest`).",
  'react.error.useStoreOutsideProvider':
    "useStateProvider s'ha d'utilitzar dins d'un StateProvider.",
  'react.error.useStorageOutsideProvider':
    "useStorageProvider s'ha d'utilitzar dins d'un StorageProvider.",
  'react.error.useThemeOutsideProvider':
    "useThemeProvider s'ha d'utilitzar dins d'un ThemeProvider.",
  'react.error.useToastOutsideProvider': "useToast s'ha d'utilitzar dins d'un ToastProvider.",
  'react.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider s'ha d'utilitzar dins d'un WorkspaceProvider.",
  'react.error.oauthFailed': "L'inici de sessió amb OAuth ha fallat",
}
