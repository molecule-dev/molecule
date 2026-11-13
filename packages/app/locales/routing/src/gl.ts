import type { RoutingTranslations } from './types.js'

/** Routing translations for Galician. */
export const gl: RoutingTranslations = {
  'routing.error.missingParam': 'Falta o parámetro "{{name}}" para a ruta "{{pattern}}"',
  'routing.error.routeNotFound': 'Non se atopou a ruta "{{name}}"',
  'routing.error.noNavigationRef':
    'Referencia de navegación non definida. Asegúrate de que `MoleculeProvider` estea montado.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` debe usarse dentro dun enrutador React Router. Monte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ou `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Usouse o histórico de React Router antes de que se renderizase o seu compoñente. Mónteo dentro dun enrutador React Router mediante MoleculeRouterProvider ou useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize debe ser un enteiro seguro positivo',
  'routing.listRoute.error.authRequired':
    'useListRoute: as seleccións protexidas esixen auth.status e auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: selección descoñecida "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtro descoñecido "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: o filtro de ruta "{{filter}}" esixe o param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: o filtro de ruta "{{filter}}" non se pode eliminar',
  'routing.listRoute.error.pathPattern':
    'useListRoute: cambiar parámetros de ruta esixe un padrón de ruta',
  'routing.listRoute.error.page': 'useListRoute: page debe ser un enteiro seguro positivo',
  'routing.sveltekit.error.serverHistory':
    'os movementos do histórico só están dispoñibles no navegador: o enrutador cliente de SvelteKit non se executa durante a renderización no servidor',
}
