import type { RoutingTranslations } from './types.js'

/** Routing translations for Malay. */
export const ms: RoutingTranslations = {
  'routing.error.missingParam': 'Parameter "{{name}}" tiada untuk laluan "{{pattern}}"',
  'routing.error.routeNotFound': 'Laluan "{{name}}" tidak dijumpai',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter mesti digunakan dalam MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Rujukan navigasi tidak ditetapkan. Pastikan `MoleculeProvider` dipasang.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` mesti digunakan dalam penghala React Router. Pasang `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` atau `RouterProvider`.',
}
