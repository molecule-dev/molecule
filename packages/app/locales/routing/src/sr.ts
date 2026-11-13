import type { RoutingTranslations } from './types.js'

/** Routing translations for Serbian. */
export const sr: RoutingTranslations = {
  'routing.error.missingParam': 'Недостаје параметар "{{name}}" за путању "{{pattern}}"',
  'routing.error.routeNotFound': 'Путања "{{name}}" није пронађена',
  'routing.error.noNavigationRef':
    'Референца за навигацију није подешена. Уверите се да је `MoleculeProvider` монтиран.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` мора да се користи унутар React Router рутера. Монтирајте `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Историја React Router је коришћена пре него што се њена компонента приказала. Монтирајте је унутар React Router рутера путем MoleculeRouterProvider или useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize мора бити позитиван безбедан цео број',
  'routing.listRoute.error.authRequired':
    'useListRoute: заштићене селекције захтевају auth.status и auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: непозната селекција "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: непознат филтер "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: филтер путање "{{filter}}" захтева параметар "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: филтер путање "{{filter}}" не може да се уклони',
  'routing.listRoute.error.pathPattern':
    'useListRoute: промена параметара путање захтева образац путање',
  'routing.listRoute.error.page': 'useListRoute: page мора бити позитиван безбедан цео број',
  'routing.sveltekit.error.serverHistory':
    'померања по историји доступна су само у прегледачу: клијентски рутер SvelteKit не ради током приказивања на серверу',
}
