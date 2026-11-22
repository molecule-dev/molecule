import type { SvelteTranslations } from './types.js'

/** Svelte translations for ca. */
export const ca: Partial<SvelteTranslations> = {
  'svelte.error.unknownPaginationDirection': 'Direcció de paginació desconeguda: "{{direction}}"',
  'svelte.error.noStateProvider': 'Proveïdor estatal no trobat en context',
  'svelte.error.noAuthClient': "Client d'autenticació no trobat en context",
  'svelte.error.noThemeProvider': 'Proveïdor de temes no trobat en context',
  'svelte.error.noRouter':
    "Aquí no hi ha cap encaminador. Munteu `MoleculeRouterProvider` des de l'enllaç d'encaminament (`@molecule/app-routing-sveltekit`) a l'arrel `+layout.svelte`, o bé crideu `setMoleculeContext({ router })` allà. Si l'aplicació ja ho fa, el seu enllaç d'encaminament és més antic que aquest enllaç: actualitzeu-lo (`npm install @molecule/app-routing-sveltekit@latest`).",
  'svelte.error.noI18nProvider': 'Proveïdor I18n no trobat en context',
  'svelte.error.noHttpClient': 'Client HTTP no trobat en context',
  'svelte.error.noStorageProvider': "Proveïdor d'emmagatzematge no trobat en context",
  'svelte.error.noLoggerProvider': 'Proveïdor del registrador no trobat en context',
  'svelte.error.useChatOutsideProvider': "useChatProvider s'ha d'utilitzar dins d'un ChatProvider.",
  'svelte.error.useToastOutsideProvider': "useToast s'ha d'utilitzar dins d'un ToastProvider.",
  'svelte.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider s'ha d'utilitzar dins d'un WorkspaceProvider.",
  'svelte.error.useEditorOutsideProvider':
    "useEditorProvider s'ha d'utilitzar dins d'un EditorProvider.",
  'svelte.error.usePreviewOutsideProvider':
    "usePreviewProvider s'ha d'utilitzar dins d'un PreviewProvider.",
  'svelte.error.useAuthOutsideProvider': "useAuthClient s'ha d'utilitzar dins d'un AuthProvider.",
  'svelte.error.useThemeOutsideProvider':
    "useThemeProvider s'ha d'utilitzar dins d'un ThemeProvider.",
  'svelte.error.useRouterOutsideProvider':
    "Aquí no hi ha cap encaminador. Munteu `MoleculeRouterProvider` des de l'enllaç d'encaminament (`@molecule/app-routing-sveltekit`) a l'arrel `+layout.svelte`, o bé crideu `setMoleculeContext({ router })` allà. Si l'aplicació ja ho fa, el seu enllaç d'encaminament és més antic que aquest enllaç: actualitzeu-lo (`npm install @molecule/app-routing-sveltekit@latest`).",
  'svelte.error.noRoutedView':
    "Aquí no hi ha cap vista enrutada. SvelteKit dóna a un disseny la seva pàgina com a `children`: passa `{@render children()}` dins d'aquest component.",
  'svelte.error.useHttpOutsideProvider': "useHttpClient s'ha d'utilitzar dins d'un HttpProvider.",
  'svelte.error.useStorageOutsideProvider':
    "useStorageProvider s'ha d'utilitzar dins d'un StorageProvider.",
  'svelte.error.useLoggerOutsideProvider':
    "useLoggerProvider s'ha d'utilitzar dins d'un LoggerProvider.",
  'svelte.error.useStoreOutsideProvider':
    "useStateProvider s'ha d'utilitzar dins d'un StateProvider.",
  'svelte.error.unsupportedMethod': 'Mètode no compatible: {{method}}',
  'svelte.error.oauthFailed': "L'inici de sessió amb OAuth ha fallat",
}
