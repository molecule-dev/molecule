import type { ReactTranslations } from './types.js'

/** React translations for Spanish. */
export const es: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Los componentes Accordion deben usarse dentro de un Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro de un AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro de un ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider debe usarse dentro de un EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro de un HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider debe usarse dentro de un LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro de un PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Aquí no hay enrutador. Monte un componente de enrutador desde el enlace de enrutamiento de la aplicación (`BrowserRouter` de `@molecule/app-routing-react-router`), o pase `router` a `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Este enlace de enrutamiento no tiene ninguna vista enrutada para mostrar aquí: en su lugar, pase la página como elementos secundarios.',
  'react.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro de un StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro de un StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro de un ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast debe usarse dentro de un ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro de un WorkspaceProvider',
  'react.error.unsupportedMethod': 'Método no soportado: {{method}}',
  'react.error.oauthFailed': 'Error al iniciar sesión con OAuth',
}
