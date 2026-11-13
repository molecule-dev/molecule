import type { RoutingTranslations } from './types.js'

/** Routing translations for Polish. */
export const pl: RoutingTranslations = {
  'routing.error.missingParam': 'Brakujący parametr "{{name}}" dla ścieżki "{{pattern}}"',
  'routing.error.routeNotFound': 'Trasa "{{name}}" nie została znaleziona',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter musi być używany wewnątrz MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Odwołanie nawigacyjne nie zostało ustawione. Upewnij się, że `MoleculeProvider` jest zamontowany.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` musi być używany w routerze React Router. Zamontuj `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` lub `RouterProvider`.',
}
