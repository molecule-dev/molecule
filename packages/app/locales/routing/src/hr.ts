import type { RoutingTranslations } from './types.js'

/** Routing translations for Croatian. */
export const hr: RoutingTranslations = {
  'routing.error.missingParam': 'Nedostaje parametar "{{name}}" za putanju "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nije pronađena',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter se mora koristiti unutar MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Navigacijska referenca nije postavljena. Provjerite je li `MoleculeProvider` montiran.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` se mora koristiti unutar React Router usmjerivača. Montirajte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ili `RouterProvider`.',
}
