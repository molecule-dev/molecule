import type { RoutingTranslations } from './types.js'

/** Routing translations for Spanish. */
export const es: RoutingTranslations = {
  'routing.error.missingParam': 'Falta el parámetro "{{name}}" para la ruta "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" no encontrada',
  'routing.error.noNavigationRef':
    'No se ha establecido la referencia de navegación. Asegúrese de que `MoleculeProvider` esté montado.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` debe usarse dentro de un enrutador React Router. Monte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` o `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Se usó el history de React Router antes de que su componente se renderizara. Móntelo dentro de un router de React Router a través de MoleculeRouterProvider o useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize debe ser un entero seguro positivo',
  'routing.listRoute.error.authRequired':
    'useListRoute: las selecciones protegidas requieren auth.status y auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: selección desconocida "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtro desconocido "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: el filtro de ruta "{{filter}}" requiere el parámetro "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: el filtro de ruta "{{filter}}" no se puede eliminar',
  'routing.listRoute.error.pathPattern':
    'useListRoute: cambiar parámetros de ruta requiere un patrón de ruta',
  'routing.listRoute.error.page': 'useListRoute: page debe ser un entero seguro positivo',
  'routing.sveltekit.error.serverHistory':
    'los movimientos de history solo están disponibles en el navegador: el router cliente de SvelteKit no se ejecuta durante el renderizado en el servidor',
}
