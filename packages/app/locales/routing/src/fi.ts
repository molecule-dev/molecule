import type { RoutingTranslations } from './types.js'

/** Routing translations for Finnish. */
export const fi: RoutingTranslations = {
  'routing.error.missingParam': 'Puuttuva parametri "{{name}}" polulle "{{pattern}}"',
  'routing.error.routeNotFound': 'Reittiä "{{name}}" ei löytynyt',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter on käytettävä MoleculeRouterProvider-komponentin sisällä',
  'routing.error.noNavigationRef':
    'Navigointiviitettä ei ole asetettu. Varmista, että `MoleculeProvider` on liitetty.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` on käytettävä React Router -reitittimen sisällä. Liitä `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` tai `RouterProvider`.',
}
