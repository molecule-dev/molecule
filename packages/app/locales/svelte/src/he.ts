import type { SvelteTranslations } from './types.js'

/** Svelte translations for Hebrew. */
export const he: SvelteTranslations = {
  'svelte.error.noStateProvider': 'ספק מצב לא נמצא בהקשר',
  'svelte.error.noAuthClient': 'לקוח אימות לא נמצא בהקשר',
  'svelte.error.noThemeProvider': 'ספק ערכת נושא לא נמצא בהקשר',
  'svelte.error.noRouter': 'נתב לא נמצא בהקשר',
  'svelte.error.noI18nProvider': 'ספק i18n לא נמצא בהקשר',
  'svelte.error.noHttpClient': 'לקוח HTTP לא נמצא בהקשר',
  'svelte.error.noStorageProvider': 'ספק אחסון לא נמצא בהקשר',
  'svelte.error.noLoggerProvider': 'ספק רישום לא נמצא בהקשר',
  'svelte.error.unknownPaginationDirection': 'כיוון עימוד לא ידוע: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'יש להשתמש ב-useChatProvider בתוך ChatProvider',
  'svelte.error.useToastOutsideProvider': 'יש להשתמש ב-useToast בתוך ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'יש להשתמש ב-useWorkspaceProvider בתוך WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider': 'יש להשתמש ב-useEditorProvider בתוך EditorProvider',
  'svelte.error.usePreviewOutsideProvider': 'יש להשתמש ב-usePreviewProvider בתוך PreviewProvider',
  'svelte.error.useAuthOutsideProvider': 'יש להשתמש ב-useAuthClient בתוך ספק אימות',
  'svelte.error.useThemeOutsideProvider': 'יש להשתמש ב-useThemeProvider בתוך ThemeProvider',
  'svelte.error.useRouterOutsideProvider': 'יש להשתמש ב-useRouterInstance בתוך RouterProvider',
  'svelte.error.useHttpOutsideProvider': 'יש להשתמש ב-useHttpClient בתוך HttpProvider',
  'svelte.error.useStorageOutsideProvider': 'יש להשתמש ב-useStorageProvider בתוך StorageProvider',
  'svelte.error.useLoggerOutsideProvider': 'יש להשתמש ב-useLoggerProvider בתוך LoggerProvider',
  'svelte.error.useStoreOutsideProvider': 'יש להשתמש ב-useStateProvider בתוך StateProvider',
  'svelte.error.unsupportedMethod': 'שיטה לא נתמכת: {{method}}',
  'svelte.error.oauthFailed': 'כניסה ל-OAuth נכשלה',
}
