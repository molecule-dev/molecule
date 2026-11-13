import type { RoutingTranslations } from './types.js'

/** Routing translations for Bulgarian. */
export const bg: RoutingTranslations = {
  'routing.error.missingParam': 'Липсващ параметър "{{name}}" за път "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрутът "{{name}}" не е намерен',
  'routing.error.noNavigationRef':
    'Навигационната препратка не е зададена. Уверете се, че `MoleculeProvider` е монтиран.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` трябва да се използва в рутер на React Router. Монтирайте `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Историята на React Router беше използвана, преди нейният компонент да е рендериран. Монтирайте я вътре в рутер на React Router чрез MoleculeRouterProvider или useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize трябва да е положително безопасно цяло число',
  'routing.listRoute.error.authRequired':
    'useListRoute: защитените селекции изискват auth.status и auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: неизвестна селекция "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: неизвестен филтър "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: филтърът по път "{{filter}}" изисква параметър "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: филтърът по път "{{filter}}" не може да бъде премахнат',
  'routing.listRoute.error.pathPattern':
    'useListRoute: промяната на параметрите на пътя изисква шаблон на път',
  'routing.listRoute.error.page': 'useListRoute: page трябва да е положително безопасно цяло число',
  'routing.sveltekit.error.serverHistory':
    'движенията по историята са налични само в браузъра: клиентският рутер на SvelteKit не работи при сървърно рендериране',
}
