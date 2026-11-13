import type { SvelteTranslations } from './types.js'

/** Svelte translations for Greek. */
export const el: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Πάροχος κατάστασης δεν βρέθηκε στο πλαίσιο',
  'svelte.error.noAuthClient': 'Πελάτης ελέγχου ταυτότητας δεν βρέθηκε στο πλαίσιο',
  'svelte.error.noThemeProvider': 'Πάροχος θέματος δεν βρέθηκε στο πλαίσιο',
  'svelte.error.noRouter': 'Δρομολογητής δεν βρέθηκε στο πλαίσιο',
  'svelte.error.noI18nProvider': 'Πάροχος i18n δεν βρέθηκε στο πλαίσιο',
  'svelte.error.noHttpClient': 'Πελάτης HTTP δεν βρέθηκε στο πλαίσιο',
  'svelte.error.noStorageProvider': 'Πάροχος αποθήκευσης δεν βρέθηκε στο πλαίσιο',
  'svelte.error.noLoggerProvider': 'Πάροχος καταγραφέα δεν βρέθηκε στο πλαίσιο',
  'svelte.error.unknownPaginationDirection': 'Άγνωστη κατεύθυνση σελιδοποίησης: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'Το useChatProvider πρέπει να χρησιμοποιείται εντός ενός ChatProvider',
  'svelte.error.useToastOutsideProvider':
    'Το useToast πρέπει να χρησιμοποιείται εντός ενός ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'Το useWorkspaceProvider πρέπει να χρησιμοποιείται εντός ενός WorkspaceProvider',
  'svelte.error.useEditorOutsideProvider':
    'Το useEditorProvider πρέπει να χρησιμοποιηθεί εντός ενός EditorProvider',
  'svelte.error.usePreviewOutsideProvider':
    'Το usePreviewProvider πρέπει να χρησιμοποιηθεί μέσα σε ένα PreviewProvider',
  'svelte.error.useAuthOutsideProvider':
    'Το useAuthClient πρέπει να χρησιμοποιηθεί μέσα σε ένα AuthProvider',
  'svelte.error.useThemeOutsideProvider':
    'Το useThemeProvider πρέπει να χρησιμοποιείται μέσα σε ένα ThemeProvider',
  'svelte.error.useRouterOutsideProvider':
    'Το useRouterInstance πρέπει να χρησιμοποιηθεί εντός ενός RouterProvider',
  'svelte.error.useHttpOutsideProvider':
    'Το useHttpClient πρέπει να χρησιμοποιηθεί μέσα σε ένα HttpProvider',
  'svelte.error.useStorageOutsideProvider':
    'Το useStorageProvider πρέπει να χρησιμοποιείται εντός ενός StorageProvider',
  'svelte.error.useLoggerOutsideProvider':
    'Το useLoggerProvider πρέπει να χρησιμοποιείται εντός ενός LoggerProvider',
  'svelte.error.useStoreOutsideProvider':
    'Το useStateProvider πρέπει να χρησιμοποιηθεί εντός ενός StateProvider',
  'svelte.error.unsupportedMethod': 'Μη υποστηριζόμενη μέθοδος: {{method}}',
  'svelte.error.oauthFailed': 'Η σύνδεση στο OAuth απέτυχε',
}
