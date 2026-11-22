import type { SvelteTranslations } from './types.js'

/** Svelte translations for Portuguese. */
export const pt: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Provedor de estado n\u00e3o encontrado no contexto',
  'svelte.error.noAuthClient': 'Cliente de autentica\u00e7\u00e3o n\u00e3o encontrado no contexto',
  'svelte.error.noThemeProvider': 'Provedor de tema n\u00e3o encontrado no contexto',
  'svelte.error.noRouter':
    'Não há roteador aqui. Monte `MoleculeRouterProvider` do vínculo de roteamento (`@molecule/app-routing-sveltekit`) no arquivo raiz `+layout.svelte`, ou chame `setMoleculeContext({ router })` lá.',
  'svelte.error.noI18nProvider': 'Provedor i18n n\u00e3o encontrado no contexto',
  'svelte.error.noHttpClient': 'Cliente HTTP n\u00e3o encontrado no contexto',
  'svelte.error.noStorageProvider': 'Provedor de armazenamento n\u00e3o encontrado no contexto',
  'svelte.error.noLoggerProvider': 'Provedor de log n\u00e3o encontrado no contexto',
  'svelte.error.unknownPaginationDirection':
    'Dire\u00e7\u00e3o de pagina\u00e7\u00e3o desconhecida: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider deve ser usado dentro de um ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast deve ser usado dentro de um ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'O parâmetro useWorkspaceProvider deve ser usado dentro de um WorkspaceProvider.',
  'svelte.error.useEditorOutsideProvider':
    'O parâmetro useEditorProvider deve ser usado dentro de um EditorProvider.',
  'svelte.error.usePreviewOutsideProvider':
    'O parâmetro usePreviewProvider deve ser usado dentro de um PreviewProvider.',
  'svelte.error.useAuthOutsideProvider':
    'O useAuthClient deve ser usado dentro de um AuthProvider.',
  'svelte.error.useThemeOutsideProvider':
    'O parâmetro useThemeProvider deve ser usado dentro de um ThemeProvider.',
  'svelte.error.useRouterOutsideProvider':
    'Não há roteador aqui. Monte `MoleculeRouterProvider` do vínculo de roteamento (`@molecule/app-routing-sveltekit`) no arquivo raiz `+layout.svelte`, ou chame `setMoleculeContext({ router })` lá.',
  'svelte.error.noRoutedView':
    'Aqui não há nenhuma visualização roteada. O SvelteKit atribui a um layout sua página como `children`: passe `{@render children()}` dentro deste componente.',
  'svelte.error.useHttpOutsideProvider':
    'O método useHttpClient deve ser usado dentro de um HttpProvider.',
  'svelte.error.useStorageOutsideProvider':
    'O parâmetro useStorageProvider deve ser usado dentro de um StorageProvider.',
  'svelte.error.useLoggerOutsideProvider':
    'O parâmetro useLoggerProvider deve ser usado dentro de um LoggerProvider.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider deve ser usado dentro de um StateProvider.',
  'svelte.error.unsupportedMethod': 'Método não suportado: {{method}}',
  'svelte.error.oauthFailed': 'Falha no login OAuth',
}
