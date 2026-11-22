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
    'Tidak ada router di sini. Pasang komponen router dari routing bond aplikasi (`BrowserRouter` dari `@molecule/app-routing-react-router`), atau berikan `router` ke `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Ikatan perutean ini tidak memiliki tampilan yang dirutekan untuk dirender di sini: teruskan halaman sebagai anak-anaknya saja.',
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
