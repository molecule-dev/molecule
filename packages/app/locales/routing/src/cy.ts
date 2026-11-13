import type { RoutingTranslations } from './types.js'

/** Routing translations for Welsh. */
export const cy: RoutingTranslations = {
  'routing.error.missingParam': 'Paramedr "{{name}}" ar goll ar gyfer llwybr "{{pattern}}"',
  'routing.error.routeNotFound': 'Ni chanfuwyd y llwybr "{{name}}"',
  'routing.error.noNavigationRef':
    "Cyfeirnod llywio heb ei osod. Gwnewch yn siŵr bod `MoleculeProvider` wedi'i osod.",
  'routing.error.useMoleculeRouterOutsideRouter':
    'Rhaid defnyddio `useMoleculeRouter` o fewn llwybrydd React Router. Mowntiwch `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, neu `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    "Defnyddiwyd hanes React Router cyn i'w gydran ganu. Mowntiwch ef o fewn llwybrydd React Router trwy MoleculeRouterProvider neu useMoleculeRouter.",
  'routing.listRoute.error.pageSize':
    'useListRoute: rhaid i pageSize fod yn gyfanrif diogel cadarnhaol',
  'routing.listRoute.error.authRequired':
    "useListRoute: mae detholiadau wedi'u diogelu angen auth.status ac auth.redirectTo",
  'routing.listRoute.error.unknownSelection': 'useListRoute: detholiad anhysbys "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: hidlydd anhysbys "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: mae hidlydd llwybr "{{filter}}" angen param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ni ellir tynnu\'r hidlydd llwybr "{{filter}}"',
  'routing.listRoute.error.pathPattern':
    'useListRoute: mae newid paramedrau llwybr angen patrwm llwybr',
  'routing.listRoute.error.page': 'useListRoute: rhaid i page fod yn gyfanrif diogel cadarnhaol',
  'routing.sveltekit.error.serverHistory':
    'mae symudiadau hanes ar gael yn y porwr yn unig: nid yw llwybrydd cleient SvelteKit yn rhedeg wrth ganu ar y gweinydd',
}
