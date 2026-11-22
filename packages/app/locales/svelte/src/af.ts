import type { SvelteTranslations } from './types.js'

/** Svelte translations for Afrikaans. */
export const af: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Staatsverskaffer nie in konteks gevind nie',
  'svelte.error.noAuthClient': 'Verifikasiekliënt nie in konteks gevind nie',
  'svelte.error.noThemeProvider': 'Temaverskaffer nie in konteks gevind nie',
  'svelte.error.noRouter':
    'Geen router hier nie. Monteer `MoleculeRouterProvider` vanaf die roeteringsbinding (`@molecule/app-routing-sveltekit`) in die wortel `+layout.svelte`, of roep `setMoleculeContext({ router })` daar aan.',
  'svelte.error.noI18nProvider': 'I18n-verskaffer nie in konteks gevind nie',
  'svelte.error.noHttpClient': 'HTTP-kliënt nie in konteks gevind nie',
  'svelte.error.noStorageProvider': 'Bergingsverskaffer nie in konteks gevind nie',
  'svelte.error.noLoggerProvider': 'Logverskaffer nie in konteks gevind nie',
  'svelte.error.unknownPaginationDirection': 'Onbekende pagineringsrigting: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': "useChatProvider moet binne 'n ChatProvider gebruik word.",
  'svelte.error.useToastOutsideProvider': "useToast moet binne 'n ToastProvider gebruik word",
  'svelte.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider moet binne 'n Werkruimteverskaffer gebruik word.",
  'svelte.error.useEditorOutsideProvider':
    "useEditorProvider moet binne 'n EditorProvider gebruik word.",
  'svelte.error.usePreviewOutsideProvider':
    "usePreviewProvider moet binne 'n PreviewProvider gebruik word",
  'svelte.error.useAuthOutsideProvider': "useAuthClient moet binne 'n AuthProvider gebruik word",
  'svelte.error.useThemeOutsideProvider':
    "useThemeProvider moet binne 'n Temaverskaffer gebruik word",
  'svelte.error.useRouterOutsideProvider':
    'Geen router hier nie. Monteer `MoleculeRouterProvider` vanaf die roeteringsbinding (`@molecule/app-routing-sveltekit`) in die wortel `+layout.svelte`, of roep `setMoleculeContext({ router })` daar aan.',
  'svelte.error.noRoutedView':
    "Geen gerouteerde aansig hier nie. SvelteKit gee 'n uitleg aan sy bladsy as `children`: gee `{@render children()}` binne hierdie komponent deur.",
  'svelte.error.useHttpOutsideProvider': "useHttpClient moet binne 'n HttpProvider gebruik word",
  'svelte.error.useStorageOutsideProvider':
    "useStorageProvider moet binne 'n StorageProvider gebruik word.",
  'svelte.error.useLoggerOutsideProvider':
    "useLoggerProvider moet binne 'n LoggerProvider gebruik word",
  'svelte.error.useStoreOutsideProvider':
    "useStateProvider moet binne 'n StateProvider gebruik word.",
  'svelte.error.unsupportedMethod': 'Nie-ondersteunde metode: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-aanmelding het misluk',
}
