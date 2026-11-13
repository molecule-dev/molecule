import type { RoutingTranslations } from './types.js'

/** Routing translations for Irish. */
export const ga: RoutingTranslations = {
  'routing.error.missingParam': 'Paraiméadar "{{name}}" ar iarraidh don chosán "{{pattern}}"',
  'routing.error.routeNotFound': 'Níor aimsíodh an bealach "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Ní mór useMoleculeRouter a úsáid laistigh de MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Níl an tagairt nascleanúna socraithe. Cinntigh go bhfuil `MoleculeProvider` feistithe.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'Ní mór `useMoleculeRouter` a úsáid laistigh de ródaire React Router. Suiteáil `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, nó `RouterProvider`.',
}
