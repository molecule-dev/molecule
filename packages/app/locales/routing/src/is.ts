import type { RoutingTranslations } from './types.js'

/** Routing translations for Icelandic. */
export const is: RoutingTranslations = {
  'routing.error.missingParam': 'Vantar breytu "{{name}}" fyrir slóð "{{pattern}}"',
  'routing.error.routeNotFound': 'Leið "{{name}}" fannst ekki',
  'routing.error.noNavigationRef':
    'Tilvísun í flakkstillingu er ekki stillt. Gakktu úr skugga um að `MoleculeProvider` sé tengt.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` verður að nota innan React Router leiðara. Tengdu `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` eða `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router-historinni var beitt áður en hluti þess var teiknaður. Tengdu hann inni í React Router-leiðara í gegnum MoleculeRouterProvider eða useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize verður að vera jákvæð örugg heiltala',
  'routing.listRoute.error.authRequired':
    'useListRoute: verndað val krefst auth.status og auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: óþekkt val "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: óþekktur sía "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: vegsía "{{filter}}" krefst param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ekki er hægt að fjarlægja vegsíuna "{{filter}}"',
  'routing.listRoute.error.pathPattern':
    'useListRoute: breyting á vegfæribreytum krefst vegmynsturs',
  'routing.listRoute.error.page': 'useListRoute: page verður að vera jákvæð örugg heiltala',
  'routing.sveltekit.error.serverHistory':
    'historíuhreyfingar eru aðeins tiltækar í vafranum: biðlaraleiðari SvelteKit keyrir ekki við teiknun á þjóni',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    'Kalla verður `useMoleculeRouter` í innsprautunarumhverfi Angular forrits sem útvegar leiðarann. Bættu `provideRouter(routes)` við veitendur forritsins.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    'Kalla verður `useMoleculeRouter` í `setup` íhlutar Vue forrits með Vue Router uppsett. Settu það upp með `app.use(router)`.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` verður að nota innan Solid Router leiðara. Tengdu `Router`, `HashRouter` eða `MemoryRouter`.',
  'routing.sveltekit.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` verður að nota innan `MoleculeRouterProvider`. Tengdu `MoleculeRouterProvider` í rótarútlitinu þínu, í kringum síðuna.',
}
