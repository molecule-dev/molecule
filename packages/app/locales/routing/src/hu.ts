import type { RoutingTranslations } from './types.js'

/** Routing translations for Hungarian. */
export const hu: RoutingTranslations = {
  'routing.error.missingParam': 'Hiányzó "{{name}}" paraméter a(z) "{{pattern}}" útvonalhoz',
  'routing.error.routeNotFound': 'A(z) "{{name}}" útvonal nem található',
  'routing.error.noNavigationRef':
    'A navigációs hivatkozás nincs beállítva. Győződjön meg arról, hogy `MoleculeProvider` fel van csatolva.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` kell rendelkezni egy React Router routeren belül. Csatlakoztasd `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` vagy `RouterProvider` függvénnyel rendelkező objektumokat.',
  'routing.error.reactRouterHistoryBeforeRender':
    'A React Router history-t a komponense renderelése előtt használták. Csatlakoztasd egy React Router routeren belül a MoleculeRouterProvider vagy a useMoleculeRouter segítségével.',
  'routing.listRoute.error.pageSize':
    'useListRoute: a pageSize pozitív biztonságos egész számnak kell lennie',
  'routing.listRoute.error.authRequired':
    'useListRoute: a védett kijelölések auth.status-t és auth.redirectTo-t igényelnek',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ismeretlen kijelölés "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: ismeretlen szűrő "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: az útvonalszűrő "{{filter}}" igényli a(z) "{{param}}" paramétert',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: az útvonalszűrő "{{filter}}" nem távolítható el',
  'routing.listRoute.error.pathPattern':
    'useListRoute: az útvonalparaméterek módosítása útvonalmintát igényel',
  'routing.listRoute.error.page':
    'useListRoute: a page pozitív biztonságos egész számnak kell lennie',
  'routing.sveltekit.error.serverHistory':
    'az előzménymozgások csak böngészőben érhetők el: a SvelteKit kliensoldali routere szerveroldali renderelés alatt nem fut',
}
