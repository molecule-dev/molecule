import type { RoutingTranslations } from './types.js'

/** Routing translations for Maltese. */
export const mt: RoutingTranslations = {
  'routing.error.missingParam': 'Parametru neqsin "{{name}}" ghar-rotta "{{pattern}}"',
  'routing.error.routeNotFound': 'Ir-rotta "{{name}}" ma nstabitx',
  'routing.error.noNavigationRef':
    'Ir-referenza tan-navigazzjoni mhux issettjata. Kun żgur li `MoleculeProvider` huwa mmuntat.',
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` irid jintuża f'router ta' React Router. Immonta `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, jew `RouterProvider`.",
  'routing.error.reactRouterHistoryBeforeRender':
    "L-istorja ta' React Router ntużet qabel ma ġie rrenderjat il-komponent tagħha. Immonta fi ħdan router ta' React Router permezz ta' MoleculeRouterProvider jew useMoleculeRouter.",
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize irid ikun numru sħiħ pożittiv u sigur',
  'routing.listRoute.error.authRequired':
    'useListRoute: l-għażliet protetti jeħtieġu auth.status u auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: għażla mhux magħrufa "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtru mhux magħruf "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: il-filtru tal-passaġġ "{{filter}}" jeħtieġ param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: il-filtru tal-passaġġ "{{filter}}" ma jistax jitneħħa',
  'routing.listRoute.error.pathPattern':
    "useListRoute: il-bidla fil-parametri tal-passaġġ teħtieġ mudell ta' passaġġ",
  'routing.listRoute.error.page': 'useListRoute: page irid ikun numru sħiħ pożittiv u sigur',
  'routing.sveltekit.error.serverHistory':
    "l-movimenti tal-istorja huma disponibbli biss fil-browser: ir-router tal-klijent ta' SvelteKit ma jaħdimx waqt ir-rendering fuq in-naħa tas-server",
}
