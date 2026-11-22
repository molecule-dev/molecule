import type { ReactTranslations } from './types.js'

/** React translations for Indonesian. */
export const id: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Komponen Accordion harus digunakan di dalam Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient harus digunakan di dalam AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider harus digunakan di dalam ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider harus digunakan di dalam EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient harus digunakan di dalam HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider harus digunakan di dalam LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider harus digunakan di dalam PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Tidak ada router di sini. Pasang komponen router dari binding routing aplikasi (`BrowserRouter` dari `@molecule/app-routing-react-router`), atau berikan `router` ke `MoleculeProvider`. Jika aplikasi sudah melakukan ini, binding routing-nya lebih lama dari binding ini: perbarui (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Ikatan routing ini tidak memiliki tampilan yang di-routing untuk dirender di sini: berikan halaman sebagai children sebagai gantinya. Jika aplikasi melakukan routing dengan `@molecule/app-routing-react-router`, ikatan tersebut lebih lama daripada ikatan ini: perbarui (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider harus digunakan di dalam StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider harus digunakan di dalam StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider harus digunakan di dalam ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast harus digunakan di dalam ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider harus digunakan di dalam WorkspaceProvider',
  'react.error.unsupportedMethod': 'Metode tidak didukung: {{method}}',
  'react.error.oauthFailed': 'Login OAuth gagal',
}
