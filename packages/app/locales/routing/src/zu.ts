import type { RoutingTranslations } from './types.js'

/** Routing translations for Zulu. */
export const zu: RoutingTranslations = {
  'routing.error.missingParam': 'Ipharamitha "{{name}}" ayitholakalanga kwindlela "{{pattern}}"',
  'routing.error.routeNotFound': 'Indlela "{{name}}" ayitholakalanga',
  'routing.error.noNavigationRef':
    'Ireferensi yokuzulazula ayisethiwe. Qinisekisa ukuthi `MoleculeProvider` ifakwe.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` kumele isetshenziswe ngaphakathi kwe-React Router router. Faka `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, noma `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Umlando we-React Router usetshenziswe ngaphambi kokuthi ingxenye yaso ibonakaliswe. Ifaka ngaphakathi kwe-React Router router nge-MoleculeRouterProvider noma useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize kumele kube yinani eliphelele eliposithivu eliphephile',
  'routing.listRoute.error.authRequired':
    'useListRoute: ukukhetha okuvikelelekile kudinga i-auth.status ne-auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ukukhetha okungaziwa "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: isihlungi esingaziwa "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: isihlungi somgudu "{{filter}}" sidinga param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: isihlungi somgudu "{{filter}}" asinakususwa',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ukushintsha amapharamitha omgudu kudinga iphethini yomgudu',
  'routing.listRoute.error.page':
    'useListRoute: page kumele kube yinani eliphelele eliposithivu eliphephile',
  'routing.sveltekit.error.serverHistory':
    'ukunyakaza komlando kutholakala kuphela kusiphequluli: i-SvelteKit client router ayisebenzi ngesikhathi sokubonakalisa ngasohlangothi lweseva',
}
