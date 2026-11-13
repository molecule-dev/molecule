import type { RoutingTranslations } from './types.js'

/** Routing translations for Belarusian. */
export const be: RoutingTranslations = {
  'routing.error.missingParam': 'Адсутнічае параметр "{{name}}" для шляху "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не знойдзены',
  'routing.error.noNavigationRef':
    'Спасылка навігацыі не зададзена. Пераканайцеся, што `MoleculeProvider` падключаны.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` павінен выкарыстоўвацца ўнутры маршрутызатара React Router. Прымацуйце `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` або `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Гісторыя React Router была выкарыстана да таго, як адарыўся яе кампанент. Прымацуйце яе ўнутры маршрутызатара React Router праз MoleculeRouterProvider або useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize павінен быць дадатным бяспечным цэлым лікам',
  'routing.listRoute.error.authRequired':
    'useListRoute: ахаваныя выбары патрабуюць auth.status і auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: невядомы выбар "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: невядомы фільтр "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: фільтр шляху "{{filter}}" патрабуе параметра "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: фільтр шляху "{{filter}}" нельга выдаліць',
  'routing.listRoute.error.pathPattern':
    'useListRoute: змена параметраў шляху патрабуе ўзору шляху',
  'routing.listRoute.error.page': 'useListRoute: page павінен быць дадатным бяспечным цэлым лікам',
  'routing.sveltekit.error.serverHistory':
    'перасоўванні па гісторыі даступныя толькі ў браўзеры: кліенцкі маршрутызатар SvelteKit не працуе падчас рэндэрынгу на серверы',
}
