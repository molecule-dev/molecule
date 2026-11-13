import type { RoutingTranslations } from './types.js'

/** Routing translations for Hausa. */
export const ha: RoutingTranslations = {
  'routing.error.missingParam': 'Babu siga "{{name}}" don hanyar "{{pattern}}"',
  'routing.error.routeNotFound': 'Ba a sami hanyar "{{name}}" ba',
  'routing.error.noNavigationRef':
    "Ba a saita ma'aunin kewayawa ba. Tabbatar cewa an saka `MoleculeProvider` a ciki.",
  'routing.error.useMoleculeRouterOutsideRouter':
    "Dole ne a yi amfani da `useMoleculeRouter` a cikin na'urar sadarwa ta React Router. Haɗa `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ko `RouterProvider`.",
  'routing.error.reactRouterHistoryBeforeRender':
    "An yi amfani da tarihin React Router kafin a zana sashensa. Haɗa shi a cikin na'urar sadarwa ta React Router ta hanyar MoleculeRouterProvider ko useMoleculeRouter.",
  'routing.listRoute.error.pageSize':
    'useListRoute: dole ne pageSize ya kasance ingantaccen lamba mai gaba daya mai aminci',
  'routing.listRoute.error.authRequired':
    'useListRoute: zaɓin kariya suna buƙatar auth.status da auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: zaɓin da ba a sani ba "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: tacewa da ba a sani ba "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: tace hanyar "{{filter}}" na buƙatar param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ba za a iya cire tacewar hanyar "{{filter}}" ba',
  'routing.listRoute.error.pathPattern':
    'useListRoute: canza sigogin hanyar yana buƙatar tsarin hanyar',
  'routing.listRoute.error.page':
    'useListRoute: dole ne page ya kasance ingantaccen lamba mai gaba daya mai aminci',
  'routing.sveltekit.error.serverHistory':
    'motsin tarihi ana samunta ne kawai a cikin burauza: mai sadarwa na abokin ciniki na SvelteKit ba ya gudana lokacin zana gefen uwar garken',
}
