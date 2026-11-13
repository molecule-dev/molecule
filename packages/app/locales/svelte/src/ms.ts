import type { SvelteTranslations } from './types.js'

/** Svelte translations for Malay. */
export const ms: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Pembekal keadaan tidak ditemui dalam konteks',
  'svelte.error.noAuthClient': 'Klien pengesahan tidak ditemui dalam konteks',
  'svelte.error.noThemeProvider': 'Pembekal tema tidak ditemui dalam konteks',
  'svelte.error.noRouter': 'Penghala tidak ditemui dalam konteks',
  'svelte.error.noI18nProvider': 'Pembekal i18n tidak ditemui dalam konteks',
  'svelte.error.noHttpClient': 'Klien HTTP tidak ditemui dalam konteks',
  'svelte.error.noStorageProvider': 'Pembekal storan tidak ditemui dalam konteks',
  'svelte.error.noLoggerProvider': 'Pembekal logger tidak ditemui dalam konteks',
  'svelte.error.unknownPaginationDirection':
    'Arah penomboran halaman tidak diketahui: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider mesti digunakan dalam ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast mesti digunakan dalam ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider mesti digunakan dalam WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider': 'useEditorProvider mesti digunakan dalam EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider mesti digunakan dalam PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient mesti digunakan dalam AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider mesti digunakan dalam ThemeProvider',
  'svelte.error.useRouterOutsideProvider': 'useRouterInstance mesti digunakan dalam RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient mesti digunakan dalam HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider mesti digunakan dalam StorageProvider',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider mesti digunakan dalam LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider mesti digunakan dalam StateProvider',
  'svelte.error.unsupportedMethod': 'Kaedah yang tidak disokong: {{method}}',
  'svelte.error.oauthFailed': 'Log masuk OAuth gagal',
}
