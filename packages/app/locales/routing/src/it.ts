import type { RoutingTranslations } from './types.js'

/** Routing translations for it. */
export const it: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Parametro "{{name}}" mancante per il percorso "{{pattern}}"',
  'routing.error.routeNotFound': 'Percorso "{{name}}" non trovato',
  'routing.error.noNavigationRef':
    'Riferimento di navigazione non impostato. Assicurarsi che `MoleculeProvider` sia montato.',
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` deve essere utilizzato all'interno di un router React Router. Monta `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` o `RouterProvider`.",
  'routing.error.reactRouterHistoryBeforeRender':
    "La history di React Router è stata usata prima del rendering del suo componente. Montalo all'interno di un router React Router tramite MoleculeRouterProvider o useMoleculeRouter.",
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize deve essere un intero sicuro positivo',
  'routing.listRoute.error.authRequired':
    'useListRoute: le selezioni protette richiedono auth.status e auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: selezione sconosciuta "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtro sconosciuto "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: il filtro del percorso "{{filter}}" richiede il param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: il filtro del percorso "{{filter}}" non può essere rimosso',
  'routing.listRoute.error.pathPattern':
    'useListRoute: modificare i parametri del percorso richiede un pattern del percorso',
  'routing.listRoute.error.page': 'useListRoute: page deve essere un intero sicuro positivo',
  'routing.sveltekit.error.serverHistory':
    'i movimenti della history sono disponibili solo nel browser: il router client di SvelteKit non viene eseguito durante il rendering lato server',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` deve essere chiamato in un contesto di iniezione di un'app Angular che fornisce il router. Aggiungi `provideRouter(routes)` ai provider dell'app.",
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` deve essere chiamato nel `setup` di un componente di un'app Vue con Vue Router installato. Installalo con `app.use(router)`.",
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` deve essere utilizzato all'interno di un router Solid Router. Monta `Router`, `HashRouter` o `MemoryRouter`.",
}
