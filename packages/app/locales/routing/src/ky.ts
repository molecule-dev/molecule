import type { RoutingTranslations } from './types.js'

/** Routing translations for Kyrgyz. */
export const ky: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" жолу үчүн "{{pattern}}" параметри жок',
  'routing.error.routeNotFound': '"{{name}}" маршруту табылган жок',
  'routing.error.noNavigationRef':
    'Навигация шилтемеси коюлган эмес. `MoleculeProvider` орнотулганын текшериңиз.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router роутеринде колдонулушу керек. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` же `RouterProvider` орнотуңуз.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router тарыхы анын компоненти көрсөтүлбөй турганда колдонулган. Аны MoleculeRouterProvider же useMoleculeRouter аркылуу React Router роутеринин ичинде орнотуңуз.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize оң коопсуз бүтүн сан болушу керек',
  'routing.listRoute.error.authRequired':
    'useListRoute: корголгон тандоолор auth.status жана auth.redirectTo талап кылат',
  'routing.listRoute.error.unknownSelection': 'useListRoute: белгисиз тандоо "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: белгисиз фильтр "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: жол фильтри "{{filter}}" "{{param}}" параметрин талап кылат',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: жол фильтри "{{filter}}" алып салууга болбойт',
  'routing.listRoute.error.pathPattern':
    'useListRoute: жол параметрлерин өзгөртүү жол шаблону талап кылат',
  'routing.listRoute.error.page': 'useListRoute: page оң коопсуз бүтүн сан болушу керек',
  'routing.sveltekit.error.serverHistory':
    'тарых боюнча жылышуулар гана браузерде жеткиликтүү: SvelteKit клиент роутери сервер тараптуу көрсөтүү учурунда иштебейт',
}
