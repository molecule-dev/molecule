import type { VueTranslations } from './types.js'

/** Vue translations for Spanish. */
export const es: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Aquí no hay enrutador. Envuelve la aplicación en `MoleculeRouterProvider` del enlace de enrutamiento (`@molecule/app-routing-vue-router`), o pasa `router` a `moleculePlugin`. Si la aplicación ya hace esto, su enlace de enrutamiento es anterior a este enlace: actualízalo (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Este enlace de enrutamiento no tiene ninguna vista enrutada para renderizar aquí: en su lugar, pase la página como elementos secundarios. Si la aplicación enruta con `@molecule/app-routing-vue-router`, ese enlace es anterior a este: actualícelo (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro de un StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro de un ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro de un AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro de un StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro de un HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider debe usarse dentro de un LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast debe usarse dentro de un ToastProvider',
  'vue.error.unsupportedMethod': 'Método no compatible: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro de un ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider debe usarse dentro de un EditorProvider',
  'vue.error.oauthFailed': 'Falló el inicio de sesión de OAuth.',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro de un PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro de un WorkspaceProvider',
}
