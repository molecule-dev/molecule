import type { SvelteTranslations } from './types.js'

/** Svelte translations for Serbian. */
export const sr: SvelteTranslations = {
  'svelte.error.noStateProvider':
    '\u041f\u0440\u043e\u0432\u0430\u0458\u0434\u0435\u0440 \u0441\u0442\u0430\u045a\u0430 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.noAuthClient':
    '\u041a\u043b\u0438\u0458\u0435\u043d\u0442 \u0437\u0430 \u0430\u0443\u0442\u0435\u043d\u0442\u0438\u043a\u0430\u0446\u0438\u0458\u0443 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.noThemeProvider':
    '\u041f\u0440\u043e\u0432\u0430\u0458\u0434\u0435\u0440 \u0442\u0435\u043c\u0435 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.noRouter':
    '\u0420\u0443\u0442\u0435\u0440 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.noI18nProvider':
    'I18n \u043f\u0440\u043e\u0432\u0430\u0458\u0434\u0435\u0440 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.noHttpClient':
    'HTTP \u043a\u043b\u0438\u0458\u0435\u043d\u0442 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.noStorageProvider':
    '\u041f\u0440\u043e\u0432\u0430\u0458\u0434\u0435\u0440 \u0441\u043a\u043b\u0430\u0434\u0438\u0448\u0442\u0430 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.noLoggerProvider':
    '\u041f\u0440\u043e\u0432\u0430\u0458\u0434\u0435\u0440 \u043b\u043e\u0433\u0435\u0440\u0430 \u043d\u0438\u0458\u0435 \u043f\u0440\u043e\u043d\u0430\u0452\u0435\u043d \u0443 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0443',
  'svelte.error.unknownPaginationDirection':
    '\u041d\u0435\u043f\u043e\u0437\u043d\u0430\u0442 \u0441\u043c\u0435\u0440 \u043f\u0430\u0433\u0438\u043d\u0430\u0446\u0438\u0458\u0435: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider мора да се користи унутар ChatProvider-а',
  'svelte.error.useToastOutsideProvider': 'useToast мора да се користи унутар ToastProvider-а',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора се користити унутар WorkspaceProvider-а',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider мора бити коришћен унутар EditorProvider-а',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider мора се користити унутар PreviewProvider-а',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient мора се користити унутар AuthProvider-а',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider мора се користити унутар ThemeProvider-а',
  'svelte.error.useRouterOutsideProvider':
    'useRouterInstance мора да се користи унутар RouterProvider-а',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient мора да се користи унутар HttpProvider-а',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider мора се користити унутар StorageProvider-а',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider мора се користити унутар LoggerProvider-а',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider мора се користити унутар StateProvider-а',
  'svelte.error.unsupportedMethod': 'Неподржана метода: {{method}}',
  'svelte.error.oauthFailed': 'Пријављивање путем OAuth-а није успело',
}
