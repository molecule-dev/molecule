import type { RoutingTranslations } from './types.js'

/** Routing translations for Swahili. */
export const sw: RoutingTranslations = {
  'routing.error.missingParam': 'Parameta "{{name}}" inakosekana kwa njia "{{pattern}}"',
  'routing.error.routeNotFound': 'Njia "{{name}}" haikupatikana',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter lazima itumike ndani ya MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Rejeleo la urambazaji halijawekwa. Hakikisha `MoleculeProvider` imewekwa.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` lazima itumike ndani ya kipanga njia cha React Router. Weka `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, au `RouterProvider`.',
}
