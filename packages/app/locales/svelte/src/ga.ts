import type { SvelteTranslations } from './types.js'

/** Svelte translations for Irish. */
export const ga: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Níor aimsíodh soláthraí stáit sa chomhthéacs',
  'svelte.error.noAuthClient': 'Níor aimsíodh cliant fíordheimhnithe sa chomhthéacs',
  'svelte.error.noThemeProvider': 'Níor aimsíodh soláthraí téama sa chomhthéacs',
  'svelte.error.noRouter':
    'Níl aon ródaire anseo. Suiteáil `MoleculeRouterProvider` ón nasc ródaithe (`@molecule/app-routing-sveltekit`) sa fhréamh `+layout.svelte`, nó glaoigh ar `setMoleculeContext({ router })` ansin. Má dhéanann an aip é seo cheana féin, tá a nasc ródaithe níos sine ná an ceangal seo: nuashonraigh é (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'Níor aimsíodh soláthraí i18n sa chomhthéacs',
  'svelte.error.noHttpClient': 'Níor aimsíodh cliant HTTP sa chomhthéacs',
  'svelte.error.noStorageProvider': 'Níor aimsíodh soláthraí stórála sa chomhthéacs',
  'svelte.error.noLoggerProvider': 'Níor aimsíodh soláthraí logálaí sa chomhthéacs',
  'svelte.error.unknownPaginationDirection': 'Treo anaithnid leathanaigh: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'Ní mór useChatProvider a úsáid laistigh de ChatProvider',
  'svelte.error.useToastOutsideProvider': 'Ní mór useToast a úsáid laistigh de ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'Ní mór SoláthraíSpáisOibre a úsáid laistigh de SholáthraíSpáisOibre',
  'svelte.error.useEditorOutsideProvider':
    'Ní mór SoláthraíEagarthóra a úsáid laistigh de SholáthraíEagarthóra',
  'svelte.error.usePreviewOutsideProvider':
    'Ní mór usePreviewProvider a úsáid laistigh de PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'Ní mór useAuthClient a úsáid laistigh de AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'Ní mór useThemeProvider a úsáid laistigh de ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Níl aon ródaire anseo. Suiteáil `MoleculeRouterProvider` ón nasc ródaithe (`@molecule/app-routing-sveltekit`) sa fhréamh `+layout.svelte`, nó glaoigh ar `setMoleculeContext({ router })` ansin. Má dhéanann an aip é seo cheana féin, tá a nasc ródaithe níos sine ná an ceangal seo: nuashonraigh é (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Níl aon radharc ródaithe anseo. Tugann SvelteKit leagan amach dá leathanach mar `children`: cuir `{@render children()}` isteach sa chomhpháirt seo.',
  'svelte.error.useHttpOutsideProvider': 'Ní mór useHttpClient a úsáid laistigh de HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'Ní mór useStorageProvider a úsáid laistigh de StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'Ní mór useLoggerProvider a úsáid laistigh de LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'Ní mór useStateProvider a úsáid laistigh de StateProvider',
  'svelte.error.unsupportedMethod': 'Modh gan tacaíocht: {{method}}',
  'svelte.error.oauthFailed': 'Theip ar logáil isteach OAuth',
}
