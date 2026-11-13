import type { RoutingTranslations } from './types.js'

/** Routing translations for Swahili. */
export const sw: RoutingTranslations = {
  'routing.error.missingParam': 'Parameta "{{name}}" inakosekana kwa njia "{{pattern}}"',
  'routing.error.routeNotFound': 'Njia "{{name}}" haikupatikana',
  'routing.error.noNavigationRef':
    'Rejeleo la urambazaji halijawekwa. Hakikisha `MoleculeProvider` imewekwa.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` lazima itumike ndani ya kipanga njia cha React Router. Weka `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, au `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Historia ya React Router ilitumika kabla ya kijenzi chake kuchakatwa. Weka ndani ya kipanga njia cha React Router kupitia MoleculeRouterProvider au useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize lazima iwe nambari kamili chanya salama',
  'routing.listRoute.error.authRequired':
    'useListRoute: uteuzi uliolindwa unahitaji auth.status na auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: uteuzi usiojulikana "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: kichuji kisichojulikana "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: kichuji cha njia "{{filter}}" kinahitaji param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: kichuji cha njia "{{filter}}" hakiwezi kuondolewa',
  'routing.listRoute.error.pathPattern':
    'useListRoute: kubadilisha vigezo vya njia kunahitaji muundo wa njia',
  'routing.listRoute.error.page': 'useListRoute: page lazima iwe nambari kamili chanya salama',
  'routing.sveltekit.error.serverHistory':
    'uisogeaji wa historia upatikani tu kwenye kivinjari: kipanga njia cha mteja cha SvelteKit hakifanyi kazi wakati wa kuonyesha upande wa seva',
}
