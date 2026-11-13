import type { RoutingTranslations } from './types.js'

/** Routing translations for Russian. */
export const ru: RoutingTranslations = {
  'routing.error.missingParam': 'Отсутствует параметр "{{name}}" для пути "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не найден',
  'routing.error.noNavigationRef':
    'Ссылка на навигацию не задана. Убедитесь, что `MoleculeProvider` смонтирован.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` необходимо использовать внутри маршрутизатора React Router. Можно также подключить `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'История React Router была использована до того, как её компонент отрендерился. Смонтируйте её внутри роутера React Router через MoleculeRouterProvider или useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize должно быть положительным безопасным целым числом',
  'routing.listRoute.error.authRequired':
    'useListRoute: защищённые выборки требуют auth.status и auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: неизвестная выборка "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: неизвестный фильтр "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: фильтр пути "{{filter}}" требует параметр "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: фильтр пути "{{filter}}" нельзя удалить',
  'routing.listRoute.error.pathPattern':
    'useListRoute: изменение параметров пути требует шаблон пути',
  'routing.listRoute.error.page':
    'useListRoute: page должно быть положительным безопасным целым числом',
  'routing.sveltekit.error.serverHistory':
    'перемещения по истории доступны только в браузере: клиентский роутер SvelteKit не работает при рендеринге на сервере',
}
