import type { SvelteTranslations } from './types.js'

/** Svelte translations for Georgian. */
export const ka: SvelteTranslations = {
  'svelte.error.noStateProvider':
    '\u10db\u10d3\u10d2\u10dd\u10db\u10d0\u10e0\u10d4\u10dd\u10d1\u10d8\u10e1 \u10de\u10e0\u10dd\u10d5\u10d0\u10d8\u10d3\u10d4\u10e0\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.noAuthClient':
    '\u10d0\u10e3\u10d7\u10d4\u10dc\u10e2\u10d8\u10e4\u10d8\u10d9\u10d0\u10ea\u10d8\u10d8\u10e1 \u10d9\u10da\u10d8\u10d4\u10dc\u10e2\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.noThemeProvider':
    '\u10d7\u10d4\u10db\u10d8\u10e1 \u10de\u10e0\u10dd\u10d5\u10d0\u10d8\u10d3\u10d4\u10e0\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.noRouter':
    '\u10e0\u10d0\u10e3\u10e2\u10d4\u10e0\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.noI18nProvider':
    'I18n \u10de\u10e0\u10dd\u10d5\u10d0\u10d8\u10d3\u10d4\u10e0\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.noHttpClient':
    'HTTP \u10d9\u10da\u10d8\u10d4\u10dc\u10e2\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.noStorageProvider':
    '\u10e1\u10d0\u10ea\u10d0\u10d5\u10d8\u10e1 \u10de\u10e0\u10dd\u10d5\u10d0\u10d8\u10d3\u10d4\u10e0\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.noLoggerProvider':
    '\u10da\u10dd\u10d2\u10d4\u10e0\u10d8\u10e1 \u10de\u10e0\u10dd\u10d5\u10d0\u10d8\u10d3\u10d4\u10e0\u10d8 \u10d5\u10d4\u10e0 \u10db\u10dd\u10d8\u10eb\u10d4\u10d1\u10dc\u10d0 \u10d9\u10dd\u10dc\u10e2\u10d4\u10e5\u10e1\u10e2\u10e8\u10d8',
  'svelte.error.unknownPaginationDirection':
    '\u10e3\u10ea\u10dc\u10dd\u10d1\u10d8 \u10de\u10d0\u10d2\u10d8\u10dc\u10d0\u10ea\u10d8\u10d8\u10e1 \u10db\u10d8\u10db\u10d0\u10e0\u10d7\u10e3\u10da\u10d4\u10d1\u10d0: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider უნდა გამოიყენოთ ChatProvider-ის შიგნით',
  'svelte.error.useToastOutsideProvider': 'useToast უნდა გამოიყენოთ ToastProvider-ის შიგნით',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider უნდა იქნას გამოყენებული WorkspaceProvider-ში.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider უნდა იქნას გამოყენებული EditorProvider-ში',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider უნდა იქნას გამოყენებული PreviewProvider-ში',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient უნდა იქნას გამოყენებული AuthProvider-ში',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider უნდა იქნას გამოყენებული ThemeProvider-ში',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance უნდა იქნას გამოყენებული RouterProvider-ში.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient უნდა იქნას გამოყენებული HttpProvider-ში',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider უნდა იქნას გამოყენებული StorageProvider-ში',
  'svelte.error.useLoggerOutsideProvider':
    'LoggerProvider-ში უნდა იქნას გამოყენებული useLoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider უნდა იქნას გამოყენებული StateProvider-ში',
  'svelte.error.unsupportedMethod': 'მხარდაუჭერელი მეთოდი: {{method}}',
  'svelte.error.oauthFailed': 'OAuth-ში შესვლა ვერ მოხერხდა',
}
