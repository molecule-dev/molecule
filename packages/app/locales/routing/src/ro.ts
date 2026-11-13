import type { RoutingTranslations } from './types.js'

/** Routing translations for Romanian. */
export const ro: RoutingTranslations = {
  'routing.error.missingParam': 'Parametrul "{{name}}" lipsește pentru calea "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nu a fost găsită',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter trebuie utilizat în interiorul unui MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Referința de navigare nu este setată. Asigurați-vă că `MoleculeProvider` este montat.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` trebuie utilizat într-un router React Router. Se montează `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` sau `RouterProvider`.',
}
