import type { RoutingTranslations } from './types.js'

/** Routing translations for Macedonian. */
export const mk: RoutingTranslations = {
  'routing.error.missingParam': 'Недостасува параметар "{{name}}" за патеката "{{pattern}}"',
  'routing.error.routeNotFound': 'Патеката "{{name}}" не е пронајдена',
  'routing.error.noNavigationRef':
    'Референцата за навигација не е поставена. Проверете дали `MoleculeProvider` е монтиран.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` мора да се користи во рамките на рутерот на React Router. Монтирајте го `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Историјата на React Router беше искористена пред да се прикаже нејзината компонента. Монтирајте ја во рамките на рутерот на React Router преку MoleculeRouterProvider или useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize мора да биде позитивен безбеден цел број',
  'routing.listRoute.error.authRequired':
    'useListRoute: заштитените селекции бараат auth.status и auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: непозната селекција "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: непознат филтер "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: филтерот на патека "{{filter}}" бара параметар "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: филтерот на патека "{{filter}}" не може да се отстрани',
  'routing.listRoute.error.pathPattern':
    'useListRoute: промената на параметрите на патеката бара шаблон на патека',
  'routing.listRoute.error.page': 'useListRoute: page мора да биде позитивен безбеден цел број',
  'routing.sveltekit.error.serverHistory':
    'движењата по историјата се достапни само во прелистувачот: клиентскиот рутер на SvelteKit не работи при прикажување на страната на серверот',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` мора да се повика во контекст на инјектирање на Angular апликација што го обезбедува рутерот. Додајте `provideRouter(routes)` на провајдерите на апликацијата.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` мора да се повика во `setup` на компонента на Vue апликација со инсталиран Vue Router. Инсталирајте го со `app.use(router)`.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` мора да се користи во рамките на рутерот на Solid Router. Монтирајте го `Router`, `HashRouter` или `MemoryRouter`.',
}
