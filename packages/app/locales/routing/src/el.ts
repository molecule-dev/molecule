import type { RoutingTranslations } from './types.js'

/** Routing translations for Greek. */
export const el: RoutingTranslations = {
  'routing.error.missingParam': 'Λείπει η παράμετρος "{{name}}" για τη διαδρομή "{{pattern}}"',
  'routing.error.routeNotFound': 'Η διαδρομή "{{name}}" δεν βρέθηκε',
  'routing.error.noNavigationRef':
    'Δεν έχει οριστεί αναφορά πλοήγησης. Βεβαιωθείτε ότι `MoleculeProvider` έχει τοποθετηθεί.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` πρέπει να χρησιμοποιείται σε έναν δρομολογητή React Router. Τοποθετήστε `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ή `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Το ιστορικό του React Router χρησιμοποιήθηκε πριν αποδοθεί το component του. Τοποθετήστε το μέσα σε έναν δρομολογητή React Router μέσω MoleculeRouterProvider ή useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: το pageSize πρέπει να είναι θετικός ασφαλής ακέραιος',
  'routing.listRoute.error.authRequired':
    'useListRoute: οι προστατευμένες επιλογές απαιτούν auth.status και auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: άγνωστη επιλογή "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: άγνωστο φίλτρο "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: το φίλτρο διαδρομής "{{filter}}" απαιτεί την παράμετρο "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: το φίλτρο διαδρομής "{{filter}}" δεν μπορεί να αφαιρεθεί',
  'routing.listRoute.error.pathPattern':
    'useListRoute: η αλλαγή παραμέτρων διαδρομής απαιτεί μοτίβο διαδρομής',
  'routing.listRoute.error.page': 'useListRoute: το page πρέπει να είναι θετικός ασφαλής ακέραιος',
  'routing.sveltekit.error.serverHistory':
    'οι μετακινήσεις ιστορικού είναι διαθέσιμες μόνο στο πρόγραμμα περιήγησης: ο δρομολογητής πελάτη του SvelteKit δεν εκτελείται κατά την αποδοχή στην πλευρά του διακομιστή',
}
