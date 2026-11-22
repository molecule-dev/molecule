import type { VueTranslations } from './types.js'

/** Vue translations for Greek. */
export const el: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Δεν υπάρχει δρομολογητής εδώ. Τυλίξτε την εφαρμογή στο `MoleculeRouterProvider` από τον δεσμό δρομολόγησης (`@molecule/app-routing-vue-router`) ή περάστε `router` στο `moleculePlugin`. Εάν η εφαρμογή το κάνει ήδη αυτό, ο δεσμός δρομολόγησής της είναι παλαιότερος από αυτόν τον δεσμό: ενημερώστε τον (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Αυτός ο δεσμός δρομολόγησης δεν έχει δρομολογημένη προβολή για απόδοση εδώ: μεταβιβάστε τη σελίδα ως θυγατρική. Εάν η εφαρμογή δρομολογείται με `@molecule/app-routing-vue-router`, αυτός ο δεσμός είναι παλαιότερος από αυτόν τον δεσμό: ενημερώστε τον (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'Το useStateProvider πρέπει να χρησιμοποιείται εντός ενός StateProvider',
  'vue.error.useThemeOutsideProvider':
    'Το useThemeProvider πρέπει να χρησιμοποιείται εντός ενός ThemeProvider',
  'vue.error.useAuthOutsideProvider':
    'Το useAuthClient πρέπει να χρησιμοποιείται εντός ενός AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'Το useStorageProvider πρέπει να χρησιμοποιείται εντός ενός StorageProvider',
  'vue.error.useHttpOutsideProvider':
    'Το useHttpClient πρέπει να χρησιμοποιείται εντός ενός HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'Το useLoggerProvider πρέπει να χρησιμοποιείται εντός ενός LoggerProvider',
  'vue.error.useToastOutsideProvider':
    'Το useToast πρέπει να χρησιμοποιείται εντός ενός ToastProvider',
  'vue.error.unsupportedMethod': 'Μη υποστηριζόμενη μέθοδος: {{method}}',
  'vue.error.useChatOutsideProvider':
    'Το useChatProvider πρέπει να χρησιμοποιείται εντός ενός ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'Το useEditorProvider πρέπει να χρησιμοποιηθεί εντός ενός EditorProvider',
  'vue.error.oauthFailed': 'Η σύνδεση στο OAuth απέτυχε',
  'vue.error.usePreviewOutsideProvider':
    'Το usePreviewProvider πρέπει να χρησιμοποιηθεί μέσα σε ένα PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'Το useWorkspaceProvider πρέπει να χρησιμοποιείται εντός ενός WorkspaceProvider',
}
