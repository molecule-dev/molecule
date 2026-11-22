import type { AngularTranslations } from './types.js'

/** Angular translations for Greek. */
export const el: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'Το useChatProvider πρέπει να χρησιμοποιείται εντός ενός ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'Το useAuthClient πρέπει να χρησιμοποιηθεί μέσα σε ένα AuthProvider',
  'angular.error.oauthFailed': 'Η σύνδεση στο OAuth απέτυχε',
  'angular.error.unsupportedMethod': 'Μη υποστηριζόμενη μέθοδος: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'Το useStateProvider πρέπει να χρησιμοποιηθεί εντός ενός StateProvider',

  'angular.error.useEditorOutsideProvider':
    'Το useEditorProvider πρέπει να χρησιμοποιείται εντός ενός EditorProvider',
  'angular.error.useHttpOutsideProvider':
    'Το useHttpClient πρέπει να χρησιμοποιείται εντός ενός HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'Το useLoggerProvider πρέπει να χρησιμοποιείται εντός ενός LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'Το usePreviewProvider πρέπει να χρησιμοποιείται εντός ενός PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Δεν υπάρχει δρομολογητής εδώ. Προσθέστε `provideMoleculeRouter()` από τον δεσμό δρομολόγησης (`@molecule/app-routing-angular-router`) στους παρόχους της εφαρμογής, μετά `provideRouter(routes)` του Angular ή περάστε `router` στον `provideMolecule`. Εάν η εφαρμογή το κάνει ήδη αυτό, ο δεσμός δρομολόγησής της είναι παλαιότερος από αυτόν τον δεσμό: ενημερώστε το (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Αυτός ο δεσμός δρομολόγησης δεν έχει δρομολογημένη προβολή για απόδοση εδώ: μεταβιβάστε τη σελίδα ως θυγατρική. Εάν η εφαρμογή δρομολογείται με `@molecule/app-routing-angular-router`, αυτός ο δεσμός είναι παλαιότερος από αυτόν τον δεσμό: ενημερώστε τον (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'Το useStorageProvider πρέπει να χρησιμοποιείται εντός ενός StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'Το useThemeProvider πρέπει να χρησιμοποιείται εντός ενός ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'Το useWorkspaceProvider πρέπει να χρησιμοποιείται εντός ενός WorkspaceProvider',
}
