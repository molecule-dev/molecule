import type { RoutingTranslations } from './types.js'

/** Routing translations for Spanish. */
export const es: RoutingTranslations = {
  'routing.error.missingParam': 'Falta el parámetro "{{name}}" para la ruta "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" no encontrada',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter debe usarse dentro de un MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'No se ha establecido la referencia de navegación. Asegúrese de que `MoleculeProvider` esté montado.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` debe usarse dentro de un enrutador React Router. Monte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` o `RouterProvider`.',
}
