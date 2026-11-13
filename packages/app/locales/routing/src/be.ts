import type { RoutingTranslations } from './types.js'

/** Routing translations for Belarusian. */
export const be: RoutingTranslations = {
  'routing.error.missingParam': 'Адсутнічае параметр "{{name}}" для шляху "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не знойдзены',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter павінен выкарыстоўвацца ўнутры MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Спасылка навігацыі не зададзена. Пераканайцеся, што `MoleculeProvider` падключаны.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` павінен выкарыстоўвацца ўнутры маршрутызатара React Router. Прымацуйце `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` або `RouterProvider`.',
}
