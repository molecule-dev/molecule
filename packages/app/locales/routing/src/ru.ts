import type { RoutingTranslations } from './types.js'

/** Routing translations for Russian. */
export const ru: RoutingTranslations = {
  'routing.error.missingParam': 'Отсутствует параметр "{{name}}" для пути "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не найден',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter должен использоваться внутри MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Ссылка на навигацию не задана. Убедитесь, что `MoleculeProvider` смонтирован.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` необходимо использовать внутри маршрутизатора React Router. Можно также подключить `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
}
