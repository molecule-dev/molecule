import type { RoutingTranslations } from './types.js'

/** Routing translations for Zulu. */
export const zu: RoutingTranslations = {
  'routing.error.missingParam': 'Ipharamitha "{{name}}" ayitholakalanga kwindlela "{{pattern}}"',
  'routing.error.routeNotFound': 'Indlela "{{name}}" ayitholakalanga',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter kumele isetshenziswe ngaphakathi kwe-MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Ireferensi yokuzulazula ayisethiwe. Qinisekisa ukuthi `MoleculeProvider` ifakwe.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` kumele isetshenziswe ngaphakathi kwe-React Router router. Faka `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, noma `RouterProvider`.',
}
