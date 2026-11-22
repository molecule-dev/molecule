import type { SvelteTranslations } from './types.js'

/** Svelte translations for Swedish. */
export const sv: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Tillst\u00e5ndsleverant\u00f6r hittades inte i kontext',
  'svelte.error.noAuthClient': 'Autentiseringsklient hittades inte i kontext',
  'svelte.error.noThemeProvider': 'Temaleverant\u00f6r hittades inte i kontext',
  'svelte.error.noRouter':
    'Ingen router här. Montera `MoleculeRouterProvider` från routingbindningen (`@molecule/app-routing-sveltekit`) i roten `+layout.svelte`, eller anropa `setMoleculeContext({ router })` där. Om appen redan gör detta är dess routingbindning äldre än denna bindning: uppdatera den (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'I18n-leverant\u00f6r hittades inte i kontext',
  'svelte.error.noHttpClient': 'HTTP-klient hittades inte i kontext',
  'svelte.error.noStorageProvider': 'Lagringsleverant\u00f6r hittades inte i kontext',
  'svelte.error.noLoggerProvider': 'Loggleverant\u00f6r hittades inte i kontext',
  'svelte.error.unknownPaginationDirection': 'Ok\u00e4nd pagineringsriktning: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider måste användas inom en ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast måste användas inom en ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider måste användas inom en WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider måste användas inom en EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider måste användas inom en PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient måste användas inom en AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider måste användas inom en ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Ingen router här. Montera `MoleculeRouterProvider` från routingbindningen (`@molecule/app-routing-sveltekit`) i roten `+layout.svelte`, eller anropa `setMoleculeContext({ router })` där. Om appen redan gör detta är dess routingbindning äldre än denna bindning: uppdatera den (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Ingen routad vy här. SvelteKit ger en layout för sin sida som `children`: skicka `{@render children()}` inuti denna komponent.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient måste användas inom en HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider måste användas inom en StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider måste användas inom en LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider måste användas inom en StateProvider',
  'svelte.error.unsupportedMethod': 'Metod som inte stöds: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-inloggning misslyckades',
}
