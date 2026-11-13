import type { RoutingTranslations } from './types.js'

/** Routing translations for Estonian. */
export const et: RoutingTranslations = {
  'routing.error.missingParam': 'Puuduv parameeter "{{name}}" teekonna "{{pattern}}" jaoks',
  'routing.error.routeNotFound': 'Marsruuti "{{name}}" ei leitud',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter tuleb kasutada MoleculeRouterProvider sees',
  'routing.error.noNavigationRef':
    'Navigeerimisviidet pole määratud. Veenduge, et `MoleculeProvider` on ühendatud.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Routeri ruuteri sees tuleb kasutada `useMoleculeRouter` . Paigaldage `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` või `RouterProvider`.',
}
