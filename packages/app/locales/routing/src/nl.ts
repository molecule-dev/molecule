import type { RoutingTranslations } from './types.js'

/** Routing translations for Dutch. */
export const nl: RoutingTranslations = {
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" voor pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" niet gevonden',
  'routing.error.noNavigationRef':
    'Navigatiereferentie niet ingesteld. Zorg ervoor dat `MoleculeProvider` is gekoppeld.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` moet binnen een React Router-router worden gebruikt. Monteer `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'De React Router-history werd gebruikt voordat de component werd gerenderd. Monteer deze binnen een React Router-router via MoleculeRouterProvider of useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize moet een positief veilig geheel getal zijn',
  'routing.listRoute.error.authRequired':
    'useListRoute: beveiligde selecties vereisen auth.status en auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: onbekende selectie "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: onbekend filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: padfilter "{{filter}}" vereist param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: padfilter "{{filter}}" kan niet worden verwijderd',
  'routing.listRoute.error.pathPattern':
    'useListRoute: het wijzigen van padparameters vereist een padpatroon',
  'routing.listRoute.error.page': 'useListRoute: page moet een positief veilig geheel getal zijn',
  'routing.sveltekit.error.serverHistory':
    'geschiedenisbewegingen zijn alleen in de browser beschikbaar: de SvelteKit-clientrouter draait niet tijdens server-side rendering',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` moet worden aangeroepen in een injectiecontext van een Angular-app die de router levert. Voeg `provideRouter(routes)` toe aan de providers van de app.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` moet worden aangeroepen in de `setup` van een component van een Vue-app met Vue Router geïnstalleerd. Installeer het met `app.use(router)`.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` moet binnen een Solid Router-router worden gebruikt. Monteer `Router`, `HashRouter` of `MemoryRouter`.',
}
