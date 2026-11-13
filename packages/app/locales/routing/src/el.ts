import type { RoutingTranslations } from './types.js'

/** Routing translations for Greek. */
export const el: RoutingTranslations = {
  'routing.error.missingParam': 'Λείπει η παράμετρος "{{name}}" για τη διαδρομή "{{pattern}}"',
  'routing.error.routeNotFound': 'Η διαδρομή "{{name}}" δεν βρέθηκε',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Το useMoleculeRouter πρέπει να χρησιμοποιείται εντός ενός MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Δεν έχει οριστεί αναφορά πλοήγησης. Βεβαιωθείτε ότι `MoleculeProvider` έχει τοποθετηθεί.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` πρέπει να χρησιμοποιείται σε έναν δρομολογητή React Router. Τοποθετήστε `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ή `RouterProvider`.',
}
