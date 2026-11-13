import type { RoutingTranslations } from './types.js'

/** Routing translations for ig. */
export const ig: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Achọpụtaghị parameter "{{name}}" maka ụzọ "{{pattern}}"',
  'routing.error.routeNotFound': 'Ahụghị ụzọ "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    "A ga-eji ojijiMoleculeRouter n'ime MoleculeRouterProvider",
  'routing.error.noNavigationRef':
    "Edobeghị ntụaka nhazigharị. Hụ na etinyere `MoleculeProvider` n'elu ya.",
  'routing.error.useMoleculeRouterOutsideRouter':
    "A ga-eji `useMoleculeRouter` n'ime rawụta React Router. Wụnye `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ma ọ bụ `RouterProvider`.",
}
