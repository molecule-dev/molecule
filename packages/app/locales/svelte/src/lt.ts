import type { SvelteTranslations } from './types.js'

/** Svelte translations for Lithuanian. */
export const lt: SvelteTranslations = {
  'svelte.error.noStateProvider': 'B\u016bsenos teik\u0117jas nerastas kontekste',
  'svelte.error.noAuthClient': 'Autentifikacijos klientas nerastas kontekste',
  'svelte.error.noThemeProvider': 'Temos teik\u0117jas nerastas kontekste',
  'svelte.error.noRouter':
    'Čia nėra maršrutizatoriaus. Prijunkite `MoleculeRouterProvider` iš maršrutizavimo jungties (`@molecule/app-routing-sveltekit`) šakniniame `+layout.svelte` faile arba ten iškvieskite `setMoleculeContext({ router })` . Jei programa jau tai daro, jos maršrutizavimo jungtis yra senesnė nei šis susiejimas: atnaujinkite jį (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'I18n teik\u0117jas nerastas kontekste',
  'svelte.error.noHttpClient': 'HTTP klientas nerastas kontekste',
  'svelte.error.noStorageProvider': 'Saugyklos teik\u0117jas nerastas kontekste',
  'svelte.error.noLoggerProvider': 'Registravimo teik\u0117jas nerastas kontekste',
  'svelte.error.unknownPaginationDirection': 'Ne\u017einoma puslapiavimo kryptis: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider turi būti naudojamas ChatProvider viduje',
  'svelte.error.useToastOutsideProvider': 'useToast turi būti naudojamas ToastProvider viduje',
  'svelte.error.useWorkspaceOutsideProvider':
    '„useWorkspaceProvider“ turi būti naudojamas „WorkspaceProvider“ viduje.',
  'svelte.error.useEditorOutsideProvider':
    '„EditorProvider“ parametras turi būti naudojamas „useEditorProvider“ parametro viduje.',
  'svelte.error.usePreviewOutsideProvider':
    '„usePreviewProvider“ turi būti naudojamas „PreviewProvider“ viduje.',
  'svelte.error.useAuthOutsideProvider':
    '„useAuthClient“ turi būti naudojamas autentifikavimo teikėjo viduje.',
  'svelte.error.useThemeOutsideProvider':
    '„useThemeProvider“ turi būti naudojamas „ThemeProvider“ viduje.',
  'svelte.error.useRouterOutsideProvider':
    'Čia nėra maršrutizatoriaus. Prijunkite `MoleculeRouterProvider` iš maršrutizavimo jungties (`@molecule/app-routing-sveltekit`) šakniniame `+layout.svelte` faile arba ten iškvieskite `setMoleculeContext({ router })` . Jei programa jau tai daro, jos maršrutizavimo jungtis yra senesnė nei šis susiejimas: atnaujinkite jį (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Čia nėra nukreipto rodinio. „SvelteKit“ suteikia savo puslapio išdėstymą kaip `children`: šio komponento viduje perduodamas `{@render children()}` .',
  'svelte.error.useHttpOutsideProvider':
    '„useHttpClient“ turi būti naudojamas „HttpProvider“ viduje.',
  'svelte.error.useStorageOutsideProvider':
    '„useStorageProvider“ turi būti naudojamas „StorageProvider“ viduje.',
  'svelte.error.useLoggerOutsideProvider':
    '„useLoggerProvider“ turi būti naudojamas „LoggerProvider“ viduje.',
  'svelte.error.useStoreOutsideProvider':
    '„useStateProvider“ turi būti naudojamas „StateProvider“ viduje.',
  'svelte.error.unsupportedMethod': 'Nepalaikomas metodas: {{method}}',
  'svelte.error.oauthFailed': 'OAuth prisijungimas nepavyko',
}
