import type { ReactTranslations } from './types.js'

/** React translations for Malay. */
export const ms: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'Komponen Accordion mesti digunakan dalam Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient mesti digunakan dalam AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider mesti digunakan dalam ChatProvider',
  'react.error.useEditorOutsideProvider': 'useEditorProvider mesti digunakan dalam EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient mesti digunakan dalam HttpProvider',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider mesti digunakan dalam LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider mesti digunakan dalam PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Tiada penghala di sini. Pasang komponen penghala daripada ikatan penghalaan aplikasi (`BrowserRouter` daripada `@molecule/app-routing-react-router`), atau serahkan `router` kepada `MoleculeProvider`. Jika aplikasi sudah melakukan ini, ikatan penghalaannya lebih lama daripada ikatan ini: kemas kininya (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Ikatan penghalaan ini tidak mempunyai paparan penghalaan untuk dipaparkan di sini: sebaliknya, luluskan halaman sebagai anak. Jika aplikasi menghalakan dengan `@molecule/app-routing-react-router`, ikatan tersebut lebih lama daripada pengikatan ini: kemas kininya (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider mesti digunakan dalam StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider mesti digunakan dalam StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider mesti digunakan dalam ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast mesti digunakan dalam ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider mesti digunakan dalam WorkspaceProvider',
  'react.error.unsupportedMethod': 'Kaedah tidak disokong: {{method}}',
  'react.error.oauthFailed': 'Log masuk OAuth gagal',
}
