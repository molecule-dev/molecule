import type { SvelteTranslations } from './types.js'

/** Svelte translations for Galician. */
export const gl: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Provedor de estado non atopado no contexto',
  'svelte.error.noAuthClient': 'Cliente de autenticación non atopado no contexto',
  'svelte.error.noThemeProvider': 'Provedor de tema non atopado no contexto',
  'svelte.error.noRouter': 'Enrutador non atopado no contexto',
  'svelte.error.noI18nProvider': 'Provedor i18n non atopado no contexto',
  'svelte.error.noHttpClient': 'Cliente HTTP non atopado no contexto',
  'svelte.error.noStorageProvider': 'Provedor de almacenamento non atopado no contexto',
  'svelte.error.noLoggerProvider': 'Provedor de rexistro non atopado no contexto',
  'svelte.error.unknownPaginationDirection': 'Dirección de paxinación descoñecida: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider debe usarse dentro dun ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast debe usarse dentro dun ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider debe usarse dentro dun WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider debe usarse dentro dun EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider debe usarse dentro de PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient debe usarse dentro dun AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider debe usarse dentro dun ThemeProvider',
  'svelte.error.useRouterOutsideProvider': 'useRouterInstance debe usarse dentro de RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient debe usarse dentro dun HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider debe usarse dentro dun StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider debe usarse dentro dun LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider debe usarse dentro dun StateProvider',
  'svelte.error.unsupportedMethod': 'Método non compatible: {{method}}',
  'svelte.error.oauthFailed': 'Fallou o inicio de sesión con OAuth',
}
