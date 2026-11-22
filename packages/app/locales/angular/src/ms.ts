import type { AngularTranslations } from './types.js'

/** Angular translations for Malay. */
export const ms: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider mesti digunakan dalam ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient mesti digunakan dalam AuthProvider',
  'angular.error.oauthFailed': 'Log masuk OAuth gagal',
  'angular.error.unsupportedMethod': 'Kaedah yang tidak disokong: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider mesti digunakan dalam StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider mesti digunakan dalam EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient mesti digunakan dalam HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider mesti digunakan dalam LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider mesti digunakan dalam PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Tiada penghala di sini. Tambahkan `provideMoleculeRouter()` daripada ikatan penghalaan (`@molecule/app-routing-angular-router`) kepada penyedia aplikasi, selepas `provideRouter(routes)` Angular, atau hantarkan `router` kepada `provideMolecule`.',
  'angular.error.noRoutedView':
    'Ikatan penghalaan ini tidak mempunyai paparan penghalaan untuk dipaparkan di sini: sebaliknya, lulus halaman sebagai anak.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider mesti digunakan dalam StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider mesti digunakan dalam ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider mesti digunakan dalam WorkspaceProvider',
}
