import type { RoutingTranslations } from './types.js'

/** Routing translations for Albanian. */
export const sq: RoutingTranslations = {
  'routing.error.missingParam': 'Mungon parametri "{{name}}" për shtegun "{{pattern}}"',
  'routing.error.routeNotFound': 'Rruga "{{name}}" nuk u gjet',
  'routing.error.noNavigationRef':
    'Referenca e navigimit nuk është vendosur. Sigurohuni që `MoleculeProvider` është montuar.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` duhet të përdoret brenda një routeri React Router. Montoni `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ose `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Historia e React Router u përdor përpara se të renditej komponenti i saj. Montoni brenda një routeri React Router përmes MoleculeRouterProvider ose useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize duhet të jetë një numër i plotë i sigurt pozitiv',
  'routing.listRoute.error.authRequired':
    'useListRoute: përzgjedhjet e mbrojtura kërkojnë auth.status dhe auth.redirectTo',
  'routing.listRoute.error.unknownSelection':
    'useListRoute: përzgjedhje e panjohur "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtrues i panjohur "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filtruesi i rrugës "{{filter}}" kërkon parametrin "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filtruesi i rrugës "{{filter}}" nuk mund të hiqet',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ndryshimi i parametrave të rrugës kërkon një model rruge',
  'routing.listRoute.error.page':
    'useListRoute: page duhet të jetë një numër i plotë i sigurt pozitiv',
  'routing.sveltekit.error.serverHistory':
    'lëvizjet e historisë janë të disponueshme vetëm në shfletues: routeri i klientit i SvelteKit nuk ekzekutohet gjatë renditjes në server',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` duhet të thirret në një kontekst injektimi të një aplikacioni Angular që ofron routerin. Shtoni `provideRouter(routes)` te ofruesit e aplikacionit.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` duhet të thirret në `setup` të një komponenti të një aplikacioni Vue me Vue Router të instaluar. Instalojeni me `app.use(router)`.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` duhet të përdoret brenda një routeri Solid Router. Montoni `Router`, `HashRouter` ose `MemoryRouter`.',
}
