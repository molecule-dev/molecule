import type { SolidTranslations } from './types.js'

/** Solid translations for Galician. */
export const gl: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider debe usarse dentro dun MoleculeProvider con estado configurado',
  'solid.error.authOutsideProvider':
    'getAuthClient debe usarse dentro dun MoleculeProvider con autenticación configurada',
  'solid.error.themeOutsideProvider':
    'getThemeProvider debe usarse dentro dun MoleculeProvider con tema configurado',
  'solid.error.routerOutsideProvider':
    'getRouter debe usarse dentro dun MoleculeProvider con enrutador configurado',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider debe usarse dentro dun MoleculeProvider con i18n configurado',
  'solid.error.httpOutsideProvider':
    'getHttpClient debe usarse dentro dun MoleculeProvider con HTTP configurado',
  'solid.error.storageOutsideProvider':
    'getStorageProvider debe usarse dentro dun MoleculeProvider con almacenamento configurado',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider debe usarse dentro dun MoleculeProvider con rexistro configurado',
  'solid.error.useAccordionOutsideProvider':
    'Os compoñentes de Accordion deben usarse dentro dun Accordion',
  'solid.error.useToastOutsideProvider': 'useToast debe usarse dentro dun ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro dun ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro dun WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider debe usarse dentro dun EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro de PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro dun AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro dun HttpProvider',
  'solid.error.unsupportedMethod': 'Método non compatible: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider debe usarse dentro dun LoggerProvider',
  'solid.error.oauthFailed': 'Fallou o inicio de sesión con OAuth',
  'solid.error.useRouterOutsideProvider':
    'Aquí non hai ningún enrutador. Usa `MoleculeRouterProvider` do enlace de enrutamento (`@molecule/app-routing-solid-router`) como `root` do enrutador ou pasa `router` a `MoleculeProvider`. Se a aplicación xa fai isto, o seu enlace de enrutamento é máis antigo que este enlace: actualízao (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Aquí non hai vista enrutada. Solid Router dálle ao compoñente dunha ruta a súa ruta aniñada como `props.children`: úsao como `component` dunha ruta ou pasa a páxina como fillos.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro dun StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro dun StorageProvider',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro dun ThemeProvider',
}
