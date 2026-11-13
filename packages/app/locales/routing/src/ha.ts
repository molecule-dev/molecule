import type { RoutingTranslations } from './types.js'

/** Routing translations for Hausa. */
export const ha: RoutingTranslations = {
  'routing.error.missingParam': 'Babu siga "{{name}}" don hanyar "{{pattern}}"',
  'routing.error.routeNotFound': 'Ba a sami hanyar "{{name}}" ba',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Dole ne a yi amfani da useMoleculeRouter a cikin MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    "Ba a saita ma'aunin kewayawa ba. Tabbatar cewa an saka `MoleculeProvider` a ciki.",
  'routing.error.useMoleculeRouterOutsideRouter':
    "Dole ne a yi amfani da `useMoleculeRouter` a cikin na'urar sadarwa ta React Router. Haɗa `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ko `RouterProvider`.",
}
