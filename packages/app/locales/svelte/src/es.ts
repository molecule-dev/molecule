import type { SvelteTranslations } from './types.js'

/** Svelte translations for Spanish. */
export const es: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Proveedor de estado no encontrado en el contexto',
  'svelte.error.noAuthClient': 'Cliente de autenticación no encontrado en el contexto',
  'svelte.error.noThemeProvider': 'Proveedor de temas no encontrado en el contexto',
  'svelte.error.noRouter': 'Enrutador no encontrado en el contexto',
  'svelte.error.noI18nProvider': 'Proveedor i18n no encontrado en el contexto',
  'svelte.error.noHttpClient': 'Cliente HTTP no encontrado en el contexto',
  'svelte.error.noStorageProvider': 'Proveedor de almacenamiento no encontrado en el contexto',
  'svelte.error.noLoggerProvider': 'Proveedor de registro no encontrado en el contexto',
  'svelte.error.unknownPaginationDirection': 'Dirección de paginación desconocida: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro de un ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast debe usarse dentro de un ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro de un WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider debe usarse dentro de un EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro de un PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro de un AuthProvider.',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro de un ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance debe usarse dentro de un RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro de un HttpProvider.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro de un StorageProvider.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider debe usarse dentro de un LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider debe usarse dentro de un StateProvider.',
  'svelte.error.unsupportedMethod': 'Método no compatible: {{method}}',
  'svelte.error.oauthFailed': 'Falló el inicio de sesión de OAuth.',
}
