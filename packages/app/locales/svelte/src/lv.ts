import type { SvelteTranslations } from './types.js'

/** Svelte translations for Latvian. */
export const lv: SvelteTranslations = {
  'svelte.error.noStateProvider':
    'St\u0101vok\u013ca nodro\u0161in\u0101t\u0101js nav atrasts kontekst\u0101',
  'svelte.error.noAuthClient': 'Autentifik\u0101cijas klients nav atrasts kontekst\u0101',
  'svelte.error.noThemeProvider':
    'Mot\u012bva nodro\u0161in\u0101t\u0101js nav atrasts kontekst\u0101',
  'svelte.error.noRouter':
    'Šeit nav maršrutētāja. Pievienojiet `MoleculeRouterProvider` no maršrutēšanas saites (`@molecule/app-routing-sveltekit`) saknē `+layout.svelte` vai izsauciet tur `setMoleculeContext({ router })` . Ja lietotne to jau dara, tās maršrutēšanas saite ir vecāka par šo saistījumu: atjauniniet to (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'I18n nodro\u0161in\u0101t\u0101js nav atrasts kontekst\u0101',
  'svelte.error.noHttpClient': 'HTTP klients nav atrasts kontekst\u0101',
  'svelte.error.noStorageProvider':
    'Kr\u0101tuves nodro\u0161in\u0101t\u0101js nav atrasts kontekst\u0101',
  'svelte.error.noLoggerProvider':
    'Re\u0123istr\u0113\u0161anas nodro\u0161in\u0101t\u0101js nav atrasts kontekst\u0101',
  'svelte.error.unknownPaginationDirection':
    'Nezin\u0101ms lapo\u0161anas virziens: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider jāizmanto ChatProvider ietvaros',
  'svelte.error.useToastOutsideProvider': 'useToast jāizmanto ToastProvider ietvaros',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ir jāizmanto WorkspaceProvider ietvaros.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider ir jāizmanto EditorProvider ietvaros.',
  'svelte.error.usePreviewOutsideProvider':
    'PreviewProvider ietvaros jāizmanto usePreviewProvider.',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient ir jāizmanto AuthProvider ietvaros.',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider ir jāizmanto ThemeProvider ietvaros.',
  'svelte.error.useRouterOutsideProvider':
    'Šeit nav maršrutētāja. Pievienojiet `MoleculeRouterProvider` no maršrutēšanas saites (`@molecule/app-routing-sveltekit`) saknē `+layout.svelte` vai izsauciet tur `setMoleculeContext({ router })` . Ja lietotne to jau dara, tās maršrutēšanas saite ir vecāka par šo saistījumu: atjauniniet to (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Šeit nav maršrutēta skata. SvelteKit piešķir lapas izkārtojumu kā `children`: šajā komponentā nodot `{@render children()}` .',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient ir jāizmanto HttpProvider ietvaros.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider ir jāizmanto StorageProvider ietvaros.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider ir jāizmanto LoggerProvider ietvaros.',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider ir jāizmanto StateProvider ietvaros.',
  'svelte.error.unsupportedMethod': 'Neatbalstīta metode: {{method}}',
  'svelte.error.oauthFailed': 'OAuth pieteikšanās neizdevās.',
}
