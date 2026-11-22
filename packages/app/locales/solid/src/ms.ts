import type { SolidTranslations } from './types.js'

/** Solid translations for Malay. */
export const ms: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider mesti digunakan dalam MoleculeProvider dengan keadaan dikonfigurasi',
  'solid.error.authOutsideProvider':
    'getAuthClient mesti digunakan dalam MoleculeProvider dengan pengesahan dikonfigurasi',
  'solid.error.themeOutsideProvider':
    'getThemeProvider mesti digunakan dalam MoleculeProvider dengan tema dikonfigurasi',
  'solid.error.routerOutsideProvider':
    'getRouter mesti digunakan dalam MoleculeProvider dengan penghala dikonfigurasi',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider mesti digunakan dalam MoleculeProvider dengan i18n dikonfigurasi',
  'solid.error.httpOutsideProvider':
    'getHttpClient mesti digunakan dalam MoleculeProvider dengan HTTP dikonfigurasi',
  'solid.error.storageOutsideProvider':
    'getStorageProvider mesti digunakan dalam MoleculeProvider dengan storan dikonfigurasi',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider mesti digunakan dalam MoleculeProvider dengan logger dikonfigurasi',
  'solid.error.useAccordionOutsideProvider': 'Komponen Accordion mesti digunakan dalam Accordion',
  'solid.error.useToastOutsideProvider': 'useToast mesti digunakan dalam ToastProvider',
  'solid.error.useChatOutsideProvider': 'useChatProvider mesti digunakan dalam ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider mesti digunakan dalam WorkspaceProvider',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider mesti digunakan dalam EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider mesti digunakan dalam PreviewProvider',
  'solid.error.useAuthOutsideProvider': 'useAuthClient mesti digunakan dalam AuthProvider',
  'solid.error.useHttpOutsideProvider': 'useHttpClient mesti digunakan dalam HttpProvider',
  'solid.error.unsupportedMethod': 'Kaedah yang tidak disokong: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider mesti digunakan dalam LoggerProvider',
  'solid.error.oauthFailed': 'Log masuk OAuth gagal',
  'solid.error.useRouterOutsideProvider':
    'Tiada penghala di sini. Gunakan `MoleculeRouterProvider` daripada ikatan penghalaan (`@molecule/app-routing-solid-router`) sebagai `root` penghala, atau serahkan `router` kepada `MoleculeProvider`. Jika aplikasi sudah melakukan ini, ikatan penghalaannya lebih lama daripada ikatan ini: kemas kininya (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Tiada paparan penghalaan di sini. Penghala Pepejal memberikan komponen laluan laluan bersarangnya sebagai `props.children`: gunakan ini sebagai `component` laluan, atau lulus halaman sebagai anak.',
  'solid.error.useStoreOutsideProvider': 'useStateProvider mesti digunakan dalam StateProvider',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider mesti digunakan dalam StorageProvider',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider mesti digunakan dalam ThemeProvider',
}
