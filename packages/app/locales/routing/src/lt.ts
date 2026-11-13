import type { RoutingTranslations } from './types.js'

/** Routing translations for Lithuanian. */
export const lt: RoutingTranslations = {
  'routing.error.missingParam': 'Trūksta parametro "{{name}}" keliui "{{pattern}}"',
  'routing.error.routeNotFound': 'Maršrutas "{{name}}" nerastas',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter turi būti naudojamas MoleculeRouterProvider viduje',
  'routing.error.noNavigationRef':
    'Navigacijos nuoroda nenustatyta. Įsitikinkite, kad prijungtas `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    '„React Router“ maršrutizatoriuje turi būti naudojamas `useMoleculeRouter` . Prijunkite `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` arba `RouterProvider`.',
}
