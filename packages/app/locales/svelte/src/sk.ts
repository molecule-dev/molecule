import type { SvelteTranslations } from './types.js'

/** Svelte translations for Slovak. */
export const sk: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Poskytovate\u013e stavu nebol n\u00e1jden\u00fd v kontexte',
  'svelte.error.noAuthClient': 'Autentifika\u010dn\u00fd klient nebol n\u00e1jden\u00fd v kontexte',
  'svelte.error.noThemeProvider': 'Poskytovate\u013e t\u00e9my nebol n\u00e1jden\u00fd v kontexte',
  'svelte.error.noRouter':
    'Žiadny smerovač tu nie je. Pripojte `MoleculeRouterProvider` z smerovacej väzby (`@molecule/app-routing-sveltekit`) do koreňového adresára `+layout.svelte` alebo tam zavolajte `setMoleculeContext({ router })`. Ak to aplikácia už robí, jej smerovacia väzba je staršia ako táto väzba: aktualizujte ju (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'I18n poskytovate\u013e nebol n\u00e1jden\u00fd v kontexte',
  'svelte.error.noHttpClient': 'HTTP klient nebol n\u00e1jden\u00fd v kontexte',
  'svelte.error.noStorageProvider':
    'Poskytovate\u013e \u00falo\u017eiska nebol n\u00e1jden\u00fd v kontexte',
  'svelte.error.noLoggerProvider': 'Poskytovate\u013e logovania nebol n\u00e1jden\u00fd v kontexte',
  'svelte.error.unknownPaginationDirection': 'Nezn\u00e1my smer str\u00e1nkovania: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider musí byť použitý vnútri ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast musí byť použitý vnútri ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider sa musí použiť v rámci WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider sa musí použiť v rámci EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider sa musí použiť v rámci PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient sa musí použiť v rámci AuthProvider',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider sa musí použiť v rámci ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Žiadny smerovač tu nie je. Pripojte `MoleculeRouterProvider` z smerovacej väzby (`@molecule/app-routing-sveltekit`) do koreňového adresára `+layout.svelte` alebo tam zavolajte `setMoleculeContext({ router })`. Ak to aplikácia už robí, jej smerovacia väzba je staršia ako táto väzba: aktualizujte ju (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Žiadne smerované zobrazenie tu nie je. SvelteKit priradí rozloženie svojej stránky ako `children`: v rámci tohto komponentu zadajte `{@render children()}`.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient sa musí použiť v rámci HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider sa musí použiť v rámci StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider sa musí použiť v rámci LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider sa musí použiť v rámci StateProvider',
  'svelte.error.unsupportedMethod': 'Nepodporovaná metóda: {{method}}',
  'svelte.error.oauthFailed': 'Prihlásenie cez OAuth zlyhalo',
}
