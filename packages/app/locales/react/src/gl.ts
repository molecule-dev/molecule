import type { ReactTranslations } from './types.js'

/** React translations for Galician. */
export const gl: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Os compoñentes Accordion deben usarse dentro dun Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro dun AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro dun ChatProvider',
  'react.error.useEditorOutsideProvider': 'useEditorProvider debe usarse dentro dun EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro dun HttpProvider',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider debe usarse dentro dun LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro dun PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Aquí non hai ningún enrutador. Monta un compoñente de enrutador desde o enlace de enrutamento da aplicación (`BrowserRouter` de `@molecule/app-routing-react-router`) ou pasa `router` a `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Este enlace de enrutamento non ten ningunha vista enrutada para renderizar aquí: pásase a páxina como filla no seu lugar.',
  'react.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro dun StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro dun StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro dun ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast debe usarse dentro dun ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro dun WorkspaceProvider',
  'react.error.unsupportedMethod': 'Método non compatible: {{method}}',
  'react.error.oauthFailed': 'Fallou o inicio de sesión con OAuth',
}
