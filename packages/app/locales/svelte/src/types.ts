/** Translation keys for the svelte locale package. */
export type SvelteTranslationKey =
  | 'svelte.error.noStateProvider'
  | 'svelte.error.noAuthClient'
  | 'svelte.error.noThemeProvider'
  | 'svelte.error.noRouter'
  | 'svelte.error.noI18nProvider'
  | 'svelte.error.noHttpClient'
  | 'svelte.error.noStorageProvider'
  | 'svelte.error.noLoggerProvider'
  | 'svelte.error.unknownPaginationDirection'
  | 'svelte.error.useChatOutsideProvider'
  | 'svelte.error.useToastOutsideProvider'
  | 'svelte.error.useWorkspaceOutsideProvider'
  | 'svelte.error.useEditorOutsideProvider'
  | 'svelte.error.usePreviewOutsideProvider'
  | 'svelte.error.useAuthOutsideProvider'
  | 'svelte.error.useThemeOutsideProvider'
  | 'svelte.error.useRouterOutsideProvider'
  | 'svelte.error.useHttpOutsideProvider'
  | 'svelte.error.useStorageOutsideProvider'
  | 'svelte.error.useLoggerOutsideProvider'
  | 'svelte.error.useStoreOutsideProvider'
  | 'svelte.error.unsupportedMethod'
  | 'svelte.error.oauthFailed'

/** Translation record mapping svelte keys to translated strings. */
export type SvelteTranslations = Record<SvelteTranslationKey, string>
