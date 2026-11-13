import type { RoutingTranslations } from './types.js'

/** Routing translations for Galician. */
export const gl: RoutingTranslations = {
  'routing.error.missingParam': 'Falta o parámetro "{{name}}" para a ruta "{{pattern}}"',
  'routing.error.routeNotFound': 'Non se atopou a ruta "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter debe usarse dentro dun MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Referencia de navegación non definida. Asegúrate de que `MoleculeProvider` estea montado.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` debe usarse dentro dun enrutador React Router. Monte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ou `RouterProvider`.',
}
