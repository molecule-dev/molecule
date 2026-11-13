import type { RoutingTranslations } from './types.js'

/** Routing translations for English. */
export const en: RoutingTranslations = {
  'routing.error.missingParam': 'Missing param "{{name}}" for path "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" not found',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter must be used within a MoleculeRouterProvider',
  'routing.error.noNavigationRef': 'Navigation ref not set. Ensure `MoleculeProvider` is mounted.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` must be used within a React Router router. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, or `RouterProvider`.',
}
