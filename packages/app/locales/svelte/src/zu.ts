import type { SvelteTranslations } from './types.js'

/** Svelte translations for Zulu. */
export const zu: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Umhlinzeki wesimo awutholakalanga esimweni',
  'svelte.error.noAuthClient': 'Iklayenti yokuqinisekisa ayitholakalanga esimweni',
  'svelte.error.noThemeProvider': 'Umhlinzeki wesihloko awutholakalanga esimweni',
  'svelte.error.noRouter':
    'Ayikho i-router lapha. Faka `MoleculeRouterProvider` kusuka ku-routing bond (`@molecule/app-routing-sveltekit`) empandeni `+layout.svelte`, noma ushayele `setMoleculeContext({ router })` lapho. Uma uhlelo lokusebenza seluvele lukwenza lokhu, i-routing bond yalo indala kunalokhu kubopha: yibuyekeze (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'Umhlinzeki we-i18n awutholakalanga esimweni',
  'svelte.error.noHttpClient': 'Iklayenti ye-HTTP ayitholakalanga esimweni',
  'svelte.error.noStorageProvider': 'Umhlinzeki wesitoreji awutholakalanga esimweni',
  'svelte.error.noLoggerProvider': 'Umhlinzeki weloga awutholakalanga esimweni',
  'svelte.error.unknownPaginationDirection':
    'Indlela yokwehlukanisa amakhasi engaziwa: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider kumele kusetshenziswe ngaphakathi kwe-ChatProvider',
  'svelte.error.useToastOutsideProvider':
    'useToast kumele kusetshenziswe ngaphakathi kwe-ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'I-useWorkspaceProvider kumele isetshenziswe ngaphakathi kwe-WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'i-useEditorProvider kumele isetshenziswe ngaphakathi kwe-EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'i-usePreviewProvider kumele isetshenziswe ngaphakathi kwe-PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'i-useAuthClient kumele isetshenziswe ngaphakathi kwe-AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'i-useThemeProvider kumele isetshenziswe ngaphakathi kwe-ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Ayikho i-router lapha. Faka `MoleculeRouterProvider` kusuka ku-routing bond (`@molecule/app-routing-sveltekit`) empandeni `+layout.svelte`, noma ushayele `setMoleculeContext({ router })` lapho. Uma uhlelo lokusebenza seluvele lukwenza lokhu, i-routing bond yalo indala kunalokhu kubopha: yibuyekeze (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Akukho ukubuka okuqondiswe lapha. I-SvelteKit inikeza isakhiwo ikhasi layo njenge- `children`: dlula `{@render children()}` ngaphakathi kwalesi sici.',
  'svelte.error.useHttpOutsideProvider':
    'i-useHttpClient kumele isetshenziswe ngaphakathi kwe-HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'i-useStorageProvider kumele isetshenziswe ngaphakathi kwe-StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'i-useLoggerProvider kumele isetshenziswe ngaphakathi kwe-LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'i-useStateProvider kumele isetshenziswe ngaphakathi kwe-StateProvider',
  'svelte.error.unsupportedMethod': 'Indlela engasekelwa: {{method}}',
  'svelte.error.oauthFailed': 'Ukungena ngemvume kwe-OAuth kwehlulekile',
}
