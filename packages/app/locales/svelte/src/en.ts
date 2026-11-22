import type { SvelteTranslations } from './types.js'

/** Svelte translations for English. */
export const en: SvelteTranslations = {
  'svelte.error.noStateProvider': 'State provider not found in context',
  'svelte.error.noAuthClient': 'Auth client not found in context',
  'svelte.error.noThemeProvider': 'Theme provider not found in context',
  'svelte.error.noRouter':
    'No router here. Mount `MoleculeRouterProvider` from the routing bond (`@molecule/app-routing-sveltekit`) in the root `+layout.svelte`, or call `setMoleculeContext({ router })` there.',
  'svelte.error.noI18nProvider': 'I18n provider not found in context',
  'svelte.error.noHttpClient': 'HTTP client not found in context',
  'svelte.error.noStorageProvider': 'Storage provider not found in context',
  'svelte.error.noLoggerProvider': 'Logger provider not found in context',
  'svelte.error.unknownPaginationDirection': 'Unknown pagination direction: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider must be used within a ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast must be used within a ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider must be used within a WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider must be used within an EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider must be used within a PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient must be used within an AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider must be used within a ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'No router here. Mount `MoleculeRouterProvider` from the routing bond (`@molecule/app-routing-sveltekit`) in the root `+layout.svelte`, or call `setMoleculeContext({ router })` there.',
  'svelte.error.noRoutedView':
    'No routed view here. SvelteKit gives a layout its page as `children`: pass `{@render children()}` inside this component.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient must be used within an HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider must be used within a StorageProvider',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider must be used within a LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider must be used within a StateProvider',
  'svelte.error.unsupportedMethod': 'Unsupported method: {{method}}',
  'svelte.error.oauthFailed': 'OAuth login failed',
}
