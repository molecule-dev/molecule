import type { RoutingTranslations } from './types.js'

/** Routing translations for Bosnian. */
export const bs: RoutingTranslations = {
  'routing.error.missingParam': 'Nedostaje parametar "{{name}}" za putanju "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nije pronađena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter se mora koristiti unutar MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Navigacijska referenca nije postavljena. Provjerite je li `MoleculeProvider` montiran.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` se mora koristiti unutar React Router rutera. Montirajte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ili `RouterProvider`.',
}
