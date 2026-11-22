import type { SvelteTranslations } from './types.js'

/** Svelte translations for Norwegian Bokmål. */
export const nb: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Tilstandsleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noAuthClient': 'Autentiseringsklient ikke funnet i kontekst',
  'svelte.error.noThemeProvider': 'Temaleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noRouter':
    'Ingen ruter her. Monter `MoleculeRouterProvider` fra rutingsbindingen (`@molecule/app-routing-sveltekit`) i roten `+layout.svelte`, eller kall `setMoleculeContext({ router })` der. Hvis appen allerede gjør dette, er rutingsbindingen eldre enn denne bindingen: oppdater den (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'I18n-leverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noHttpClient': 'HTTP-klient ikke funnet i kontekst',
  'svelte.error.noStorageProvider': 'Lagringsleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.noLoggerProvider': 'Loggleverand\u00f8r ikke funnet i kontekst',
  'svelte.error.unknownPaginationDirection': 'Ukjent pagineringsretning: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider må brukes innenfor en ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast må brukes innenfor en ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider må brukes innenfor en WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider': 'useEditorProvider må brukes i en EditorProvider',
  'svelte.error.usePreviewOutsideProvider': 'usePreviewProvider må brukes i en PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient må brukes i en AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider må brukes i en ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Ingen ruter her. Monter `MoleculeRouterProvider` fra rutingsbindingen (`@molecule/app-routing-sveltekit`) i roten `+layout.svelte`, eller kall `setMoleculeContext({ router })` der. Hvis appen allerede gjør dette, er rutingsbindingen eldre enn denne bindingen: oppdater den (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Ingen rutet visning her. SvelteKit gir siden sin et oppsett som `children`: send `{@render children()}` inn i denne komponenten.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient må brukes i en HttpProvider',
  'svelte.error.useStorageOutsideProvider': 'useStorageProvider må brukes i en StorageProvider',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider må brukes i en LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider må brukes i en StateProvider',
  'svelte.error.unsupportedMethod': 'Metode som ikke støttes: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-pålogging mislyktes',
}
