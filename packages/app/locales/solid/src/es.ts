import type { SolidTranslations } from './types.js'

/** Solid translations for Spanish. */
export const es: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider debe usarse dentro de un MoleculeProvider con estado configurado',
  'solid.error.authOutsideProvider':
    'getAuthClient debe usarse dentro de un MoleculeProvider con autenticación configurada',
  'solid.error.themeOutsideProvider':
    'getThemeProvider debe usarse dentro de un MoleculeProvider con tema configurado',
  'solid.error.routerOutsideProvider':
    'getRouter debe usarse dentro de un MoleculeProvider con enrutador configurado',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider debe usarse dentro de un MoleculeProvider con i18n configurado',
  'solid.error.httpOutsideProvider':
    'getHttpClient debe usarse dentro de un MoleculeProvider con HTTP configurado',
  'solid.error.storageOutsideProvider':
    'getStorageProvider debe usarse dentro de un MoleculeProvider con almacenamiento configurado',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider debe usarse dentro de un MoleculeProvider con registro configurado',
  'solid.error.useAccordionOutsideProvider':
    'Los componentes de Accordion deben usarse dentro de un Accordion',
  'solid.error.useToastOutsideProvider': 'useToast debe usarse dentro de un ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro de un ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro de un WorkspaceProvider',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider debe usarse dentro de un EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro de un PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro de un AuthProvider.',
  'solid.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro de un HttpProvider.',
  'solid.error.unsupportedMethod': 'Método no compatible: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider debe usarse dentro de un LoggerProvider',
  'solid.error.oauthFailed': 'Falló el inicio de sesión de OAuth.',
  'solid.error.useRouterOutsideProvider':
    'Aquí no hay enrutador. Utilice `MoleculeRouterProvider` del enlace de enrutamiento (`@molecule/app-routing-solid-router`) como la `root` del enrutador, o pase `router` a `MoleculeProvider`.',
  'solid.error.noRoutedView':
    'Aquí no hay vista enrutada. Solid Router le da al componente de una ruta su ruta anidada como `props.children`: use esto como un `component` de una ruta, o pase la página como hijos.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro de un StateProvider.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro de un StorageProvider.',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro de un ThemeProvider',
}
