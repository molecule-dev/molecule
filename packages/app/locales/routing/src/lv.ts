import type { RoutingTranslations } from './types.js'

/** Routing translations for Latvian. */
export const lv: RoutingTranslations = {
  'routing.error.missingParam': 'Trūkst parametra "{{name}}" ceļam "{{pattern}}"',
  'routing.error.routeNotFound': 'Maršruts "{{name}}" nav atrasts',
  'routing.error.noNavigationRef':
    'Navigācijas atsauce nav iestatīta. Pārliecinieties, vai ir pievienots `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Router maršrutētāja ietvaros jāizmanto `useMoleculeRouter` . Pievienojiet `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` vai `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router vēsturi izmantoja, pirms tā komponents tika attēlots. Pievienojiet to React Router maršrutētāja ietvaros, izmantojot MoleculeRouterProvider vai useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize jābūt pozitīvam drošam veselam skaitlim',
  'routing.listRoute.error.authRequired':
    'useListRoute: aizsargātām atlasei nepieciešami auth.status un auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: neatpazinta atlase "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: neatpazints filtrs "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ceļa filtrs "{{filter}}" pieprasa parametru "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ceļa filtru "{{filter}}" nevar noņemt',
  'routing.listRoute.error.pathPattern': 'useListRoute: ceļa parametru maiņa pieprasa ceļa veidni',
  'routing.listRoute.error.page': 'useListRoute: page jābūt pozitīvam drošam veselam skaitlim',
  'routing.sveltekit.error.serverHistory':
    'vēstures pārvietojumi ir pieejami tikai pārlūkā: SvelteKit klienta maršrutētājs nedarbojas servera pušu renderēšanas laikā',
}
