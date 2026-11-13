import type { RoutingTranslations } from './types.js'

/** Routing translations for af. */
export const af: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" vir pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Roete "{{name}}" nie gevind nie',
  'routing.error.noNavigationRef':
    'Navigasieverwysing nie gestel nie. Maak seker dat `MoleculeProvider` gemonteer is.',
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` moet binne 'n React Router-router gebruik word. Monteer `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` of `RouterProvider`.",
  'routing.error.reactRouterHistoryBeforeRender':
    "Die React Router-geskiedenis is gebruik voordat sy komponent gelewer is. Monteer dit binne 'n React Router-router via MoleculeRouterProvider of useMoleculeRouter.",
  'routing.listRoute.error.pageSize':
    "useListRoute: pageSize moet 'n positiewe veilige heelgetal wees",
  'routing.listRoute.error.authRequired':
    'useListRoute: beskermde seleksies vereis auth.status en auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: onbekende seleksie "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: onbekende filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: padfilter "{{filter}}" vereis param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: padfilter "{{filter}}" kan nie verwyder word nie',
  'routing.listRoute.error.pathPattern':
    "useListRoute: die verander van padparameters vereis 'n padpatroon",
  'routing.listRoute.error.page': "useListRoute: page moet 'n positiewe veilige heelgetal wees",
  'routing.sveltekit.error.serverHistory':
    'geskiedenisbewegings is slegs in die blaaier beskikbaar: die SvelteKit-kliëntrouter loop nie tydens weergawe aan die bedienerkant nie',
}
