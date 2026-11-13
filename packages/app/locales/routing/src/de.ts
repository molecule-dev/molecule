import type { RoutingTranslations } from './types.js'

/** Routing translations for German. */
export const de: RoutingTranslations = {
  'routing.error.missingParam': 'Fehlender Parameter "{{name}}" für Pfad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" nicht gefunden',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter muss innerhalb eines MoleculeRouterProvider verwendet werden',
  'routing.error.noNavigationRef':
    'Navigationsreferenz nicht gesetzt. Stellen Sie sicher, dass `MoleculeProvider` eingebunden ist.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` muss innerhalb eines React Router-Routers verwendet werden. Mounten Sie `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` oder `RouterProvider`.',
}
