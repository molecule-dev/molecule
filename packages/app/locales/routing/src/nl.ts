import type { RoutingTranslations } from './types.js'

/** Routing translations for Dutch. */
export const nl: RoutingTranslations = {
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" voor pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" niet gevonden',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter moet binnen een MoleculeRouterProvider worden gebruikt',
  'routing.error.noNavigationRef':
    'Navigatiereferentie niet ingesteld. Zorg ervoor dat `MoleculeProvider` is gekoppeld.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` moet binnen een React Router-router worden gebruikt. Monteer `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` `RouterProvider`.',
}
