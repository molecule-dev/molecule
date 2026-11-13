import type { RoutingTranslations } from './types.js'

/** Routing translations for Slovenian. */
export const sl: RoutingTranslations = {
  'routing.error.missingParam': 'Manjkajoč parameter "{{name}}" za pot "{{pattern}}"',
  'routing.error.routeNotFound': 'Pot "{{name}}" ni bila najdena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter je treba uporabiti znotraj MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Navigacijska referenca ni nastavljena. Prepričajte se, da je `MoleculeProvider` nameščen.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` mora biti uporabljen znotraj usmerjevalnika React Router. Priklopite `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ali `RouterProvider`.',
}
