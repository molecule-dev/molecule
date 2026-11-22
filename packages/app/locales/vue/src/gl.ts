import type { VueTranslations } from './types.js'

/** Vue translations for Galician. */
export const gl: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Aquí non hai enrutador. Envolve a aplicación en `MoleculeRouterProvider` desde o enlace de enrutamento (`@molecule/app-routing-vue-router`) ou pasa `router` a `moleculePlugin`. Se a aplicación xa fai isto, o seu enlace de enrutamento é máis antigo que este enlace: actualízao (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Este enlace de enrutamento non ten unha vista enrutada para renderizar aquí: pásase a páxina como filla no seu lugar. Se a aplicación enruta con `@molecule/app-routing-vue-router`, ese enlace é máis antigo que este enlace: actualízao (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro dun StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro dun ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro dun AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro dun StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro dun HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider debe usarse dentro dun LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast debe usarse dentro dun ToastProvider',
  'vue.error.unsupportedMethod': 'Método non compatible: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro dun ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider debe usarse dentro dun EditorProvider',
  'vue.error.oauthFailed': 'Fallou o inicio de sesión con OAuth',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider debe usarse dentro de PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro dun WorkspaceProvider',
}
