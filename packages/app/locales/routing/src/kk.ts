import type { RoutingTranslations } from './types.js'

/** Routing translations for Kazakh. */
export const kk: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" жолы үшін "{{pattern}}" параметрі жоқ',
  'routing.error.routeNotFound': '"{{name}}" маршруты табылмады',
  'routing.error.noNavigationRef':
    'Навигация сілтемесі орнатылмаған. `MoleculeProvider` орнатылғанына көз жеткізіңіз.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router маршрутизаторында пайдаланылуы керек. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` немесе `RouterProvider` орнатыңыз.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router тарихы оның компоненті көрсетілмей тұрып қолданылды. Оны MoleculeRouterProvider немесе useMoleculeRouter арқылы React Router маршрутизаторының ішінде орнатыңыз.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize оң қауіпсіз бүтін сан болуы керек',
  'routing.listRoute.error.authRequired':
    'useListRoute: қорғалған таңдаулар auth.status және auth.redirectTo талап етеді',
  'routing.listRoute.error.unknownSelection': 'useListRoute: белгісіз таңдау "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: белгісіз фильтр "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: жол сүзгісі "{{filter}}" "{{param}}" параметрін талап етеді',
  'routing.listRoute.error.pathFilterRemoved': 'useListRoute: жол сүзгісі "{{filter}}" өшірілмейді',
  'routing.listRoute.error.pathPattern':
    'useListRoute: жол параметрлерін өзгерту жол үлгісін талап етеді',
  'routing.listRoute.error.page': 'useListRoute: page оң қауіпсіз бүтін сан болуы керек',
  'routing.sveltekit.error.serverHistory':
    'тарих бойынша қозғалыстар тек браузерде қолжетімді: SvelteKit клиент маршрутизаторы серверлік көрсету кезінде жұмыс істемейді',
}
