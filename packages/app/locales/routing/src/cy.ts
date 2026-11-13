import type { RoutingTranslations } from './types.js'

/** Routing translations for Welsh. */
export const cy: RoutingTranslations = {
  'routing.error.missingParam': 'Paramedr "{{name}}" ar goll ar gyfer llwybr "{{pattern}}"',
  'routing.error.routeNotFound': 'Ni chanfuwyd y llwybr "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'Rhaid defnyddio useMoleculeRouter o fewn MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    "Cyfeirnod llywio heb ei osod. Gwnewch yn siŵr bod `MoleculeProvider` wedi'i osod.",
  'routing.error.useMoleculeRouterOutsideRouter':
    'Rhaid defnyddio `useMoleculeRouter` o fewn llwybrydd React Router. Mowntiwch `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, neu `RouterProvider`.',
}
