import type { SvelteTranslations } from './types.js'

/** Svelte translations for Bulgarian. */
export const bg: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Доставчикът на състояние не е намерен в контекста',
  'svelte.error.noAuthClient': 'Клиентът за удостоверяване не е намерен в контекста',
  'svelte.error.noThemeProvider': 'Доставчикът на тема не е намерен в контекста',
  'svelte.error.noRouter': 'Маршрутизаторът не е намерен в контекста',
  'svelte.error.noI18nProvider': 'Доставчикът на i18n не е намерен в контекста',
  'svelte.error.noHttpClient': 'HTTP клиентът не е намерен в контекста',
  'svelte.error.noStorageProvider': 'Доставчикът на хранилище не е намерен в контекста',
  'svelte.error.noLoggerProvider': 'Доставчикът на логер не е намерен в контекста',
  'svelte.error.unknownPaginationDirection': 'Неизвестна посока на страниране: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider трябва да се използва в ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast трябва да се използва в ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider трябва да се използва в рамките на WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider трябва да се използва в рамките на EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider трябва да се използва в рамките на PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient трябва да се използва в рамките на AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider трябва да се използва в рамките на ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance трябва да се използва в RouterProvider',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient трябва да се използва в рамките на HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider трябва да се използва в рамките на StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider трябва да се използва в рамките на LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider трябва да се използва в рамките на StateProvider',
  'svelte.error.unsupportedMethod': 'Неподдържан метод: {{method}}',
  'svelte.error.oauthFailed': 'Влизането чрез OAuth не бе успешно',
}
