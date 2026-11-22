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
    'Aquí no hay enrutador. Monta un componente de enrutador desde el enlace de enrutamiento de la aplicación (`BrowserRouter` de `@molecule/app-routing-react-router`), o pasa `router` a `MoleculeProvider`. Si la aplicación ya hace esto, su enlace de enrutamiento es anterior a este enlace: actualízalo (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Este enlace de enrutamiento no tiene ninguna vista enrutada para renderizar aquí: en su lugar, pase la página como elementos secundarios. Si la aplicación enruta con `@molecule/app-routing-react-router`, ese enlace es anterior a este: actualícelo (`npm install @molecule/app-routing-react-router@latest`).',
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
