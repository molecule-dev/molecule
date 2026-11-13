import type { RoutingTranslations } from './types.js'

/** Routing translations for Basque. */
export const eu: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" parametroa falta da "{{pattern}}" biderako',
  'routing.error.routeNotFound': '"{{name}}" bidea ez da aurkitu',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider baten barruan erabili behar da',
  'routing.error.noNavigationRef':
    'Nabigazio erreferentzia ez da ezarri. Ziurtatu `MoleculeProvider` muntatuta dagoela.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router bideratzaile baten barruan erabili behar da. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, edo `RouterProvider`.',
}
