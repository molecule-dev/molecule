import type { RoutingTranslations } from './types.js'

/** Routing translations for Ukrainian. */
export const uk: RoutingTranslations = {
  'routing.error.missingParam': 'Відсутній параметр "{{name}}" для шляху "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не знайдено',
  'routing.error.noNavigationRef':
    'Посилання на навігацію не встановлено. Переконайтеся, що `MoleculeProvider` змонтовано.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` має використовуватися в маршрутизаторі React Router. Монтуйте `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` або `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Історію React Router було використано до того, як відрендерився її компонент. Змонтуйте її в межах маршрутизатора React Router через MoleculeRouterProvider або useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize має бути додатним безпечним цілим числом',
  'routing.listRoute.error.authRequired':
    'useListRoute: захищені вибори вимагають auth.status і auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: невідомий вибір "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: невідомий фільтр "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: фільтр шляху "{{filter}}" вимагає параметра "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: фільтр шляху "{{filter}}" неможливо видалити',
  'routing.listRoute.error.pathPattern':
    'useListRoute: зміна параметрів шляху вимагає шаблону шляху',
  'routing.listRoute.error.page': 'useListRoute: page має бути додатним безпечним цілим числом',
  'routing.sveltekit.error.serverHistory':
    'переміщення історією доступні лише в браузері: клієнтський маршрутизатор SvelteKit не працює під час рендерингу на сервері',
}
