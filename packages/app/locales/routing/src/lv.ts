import type { RoutingTranslations } from './types.js'

/** Routing translations for Latvian. */
export const lv: RoutingTranslations = {
  'routing.error.missingParam': 'Trūkst parametra "{{name}}" ceļam "{{pattern}}"',
  'routing.error.routeNotFound': 'Maršruts "{{name}}" nav atrasts',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter jāizmanto MoleculeRouterProvider iekšienē',
  'routing.error.noNavigationRef':
    'Navigācijas atsauce nav iestatīta. Pārliecinieties, vai ir pievienots `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Router maršrutētāja ietvaros jāizmanto `useMoleculeRouter` . Pievienojiet `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` vai `RouterProvider`.',
}
