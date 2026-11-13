import type { RoutingTranslations } from './types.js'

/** Routing translations for ca. */
export const ca: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Falta el paràmetre "{{name}}" per al camí "{{pattern}}"',
  'routing.error.routeNotFound': 'La ruta "{{name}}" no s\'ha trobat',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter s'ha d'utilitzar dins d'un MoleculeRouterProvider.",
  'routing.error.noNavigationRef':
    'Referència de navegació no definida. Assegureu-vos que `MoleculeProvider` estigui muntat.',
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` s'ha d'utilitzar dins d'un encaminador React Router. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` o `RouterProvider`.",
}
