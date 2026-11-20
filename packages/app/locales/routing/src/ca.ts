import type { RoutingTranslations } from './types.js'

/** Routing translations for ca. */
export const ca: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Falta el paràmetre "{{name}}" per al camí "{{pattern}}"',
  'routing.error.routeNotFound': 'La ruta "{{name}}" no s\'ha trobat',
  'routing.error.noNavigationRef':
    'Referència de navegació no definida. Assegureu-vos que `MoleculeProvider` estigui muntat.',
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` s'ha d'utilitzar dins d'un encaminador React Router. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` o `RouterProvider`.",
  'routing.error.reactRouterHistoryBeforeRender':
    "S'ha utilitzat la història de React Router abans que es renderitzés el seu component. Munteu-la dins d'un encaminador React Router mitjançant MoleculeRouterProvider o useMoleculeRouter.",
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ha de ser un enter segur positiu',
  'routing.listRoute.error.authRequired':
    'useListRoute: les seleccions protegides requereixen auth.status i auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: selecció desconeguda "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtre desconegut "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: el filtre de ruta "{{filter}}" requereix el param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: el filtre de ruta "{{filter}}" no es pot eliminar',
  'routing.listRoute.error.pathPattern':
    'useListRoute: canviar paràmetres de ruta requereix un patró de ruta',
  'routing.listRoute.error.page': 'useListRoute: page ha de ser un enter segur positiu',
  'routing.sveltekit.error.serverHistory':
    "els moviments d'historial només estan disponibles al navegador: l'encaminador client de SvelteKit no s'executa durant el renderitzat al servidor",
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` s'ha de cridar en un context d'injecció d'una aplicació Angular que proporcioni l'encaminador. Afegiu `provideRouter(routes)` als proveïdors de l'aplicació.",
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` s'ha de cridar al `setup` d'un component d'una aplicació Vue amb Vue Router instal·lat. Instal·leu-lo amb `app.use(router)`.",
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` s'ha d'utilitzar dins d'un encaminador Solid Router. Munteu `Router`, `HashRouter` o `MemoryRouter`.",
  'routing.sveltekit.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` s'ha d'utilitzar dins d'un `MoleculeRouterProvider`. Munteu `MoleculeRouterProvider` al vostre disseny arrel, al voltant de la pàgina.",
}
