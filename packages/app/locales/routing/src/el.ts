import type { RoutingTranslations } from './types.js'

/** Routing translations for Greek. */
export const el: RoutingTranslations = {
  'routing.error.missingParam': 'Λείπει η παράμετρος "{{name}}" για τη διαδρομή "{{pattern}}"',
  'routing.error.routeNotFound': 'Η διαδρομή "{{name}}" δεν βρέθηκε',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Το useMoleculeRouter πρέπει να χρησιμοποιείται εντός ενός MoleculeRouterProvider',
}
