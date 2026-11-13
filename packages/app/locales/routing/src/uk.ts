import type { RoutingTranslations } from './types.js'

/** Routing translations for Ukrainian. */
export const uk: RoutingTranslations = {
  'routing.error.missingParam': 'Відсутній параметр "{{name}}" для шляху "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не знайдено',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter повинен використовуватися всередині MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Посилання на навігацію не встановлено. Переконайтеся, що `MoleculeProvider` змонтовано.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` має використовуватися в маршрутизаторі React Router. Монтуйте `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` або `RouterProvider`.',
}
