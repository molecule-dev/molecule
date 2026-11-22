import type { VueTranslations } from './types.js'

/** Vue translations for Malay. */
export const ms: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Tiada penghala di sini. Balutkan aplikasi dalam `MoleculeRouterProvider` daripada ikatan penghalaan (`@molecule/app-routing-vue-router`), atau serahkan `router` kepada `moleculePlugin`. Jika aplikasi sudah melakukan ini, ikatan penghalaannya lebih lama daripada ikatan ini: kemas kini (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Ikatan penghalaan ini tidak mempunyai paparan penghalaan untuk dipaparkan di sini: luluskan halaman sebagai anak. Jika aplikasi menghalakan dengan `@molecule/app-routing-vue-router`, ikatan tersebut lebih lama daripada pengikatan ini: kemas kininya (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider mesti digunakan dalam StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider mesti digunakan dalam ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient mesti digunakan dalam AuthProvider',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider mesti digunakan dalam StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient mesti digunakan dalam HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider mesti digunakan dalam LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast mesti digunakan dalam ToastProvider',
  'vue.error.unsupportedMethod': 'Kaedah tidak disokong: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider mesti digunakan dalam ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider mesti digunakan dalam EditorProvider',
  'vue.error.oauthFailed': 'Log masuk OAuth gagal',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider mesti digunakan dalam PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider mesti digunakan dalam WorkspaceProvider',
}
