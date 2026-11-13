import type { RoutingTranslations } from './types.js'

/** Routing translations for Albanian. */
export const sq: RoutingTranslations = {
  'routing.error.missingParam': 'Mungon parametri "{{name}}" për shtegun "{{pattern}}"',
  'routing.error.routeNotFound': 'Rruga "{{name}}" nuk u gjet',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter duhet të përdoret brenda një MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Referenca e navigimit nuk është vendosur. Sigurohuni që `MoleculeProvider` është montuar.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` duhet të përdoret brenda një routeri React Router. Montoni `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ose `RouterProvider`.',
}
