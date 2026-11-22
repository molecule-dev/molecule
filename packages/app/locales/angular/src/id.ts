import type { AngularTranslations } from './types.js'

/** Angular translations for Indonesian. */
export const id: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider harus digunakan di dalam ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient harus digunakan di dalam AuthProvider.',
  'angular.error.oauthFailed': 'Login OAuth gagal.',
  'angular.error.unsupportedMethod': 'Metode yang tidak didukung: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider harus digunakan di dalam StateProvider.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider harus digunakan di dalam EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient harus digunakan di dalam HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider harus digunakan di dalam LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider harus digunakan di dalam PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Tidak ada router di sini. Tambahkan `provideMoleculeRouter()` dari routing bond (`@molecule/app-routing-angular-router`) ke provider aplikasi, setelah `provideRouter(routes)` Angular, atau berikan `router` ke `provideMolecule`.',
  'angular.error.noRoutedView':
    'Ikatan perutean ini tidak memiliki tampilan yang dirutekan untuk dirender di sini: teruskan halaman sebagai anak-anaknya saja.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider harus digunakan di dalam StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider harus digunakan di dalam ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider harus digunakan di dalam WorkspaceProvider',
}
