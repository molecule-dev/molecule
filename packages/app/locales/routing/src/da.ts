import type { RoutingTranslations } from './types.js'

/** Routing translations for Danish. */
export const da: RoutingTranslations = {
  'routing.error.missingParam': 'Manglende parameter "{{name}}" for sti "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruten "{{name}}" blev ikke fundet',
  'routing.error.noNavigationRef':
    'Navigationsreferencen er ikke angivet. Sørg for, at `MoleculeProvider` er monteret.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` skal bruges i en React Router-router. Monter `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` eller `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router-historien blev brugt, før dens komponent blev rendert. Monter den i en React Router-router via MoleculeRouterProvider eller useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize skal være et positivt sikkert heltal',
  'routing.listRoute.error.authRequired':
    'useListRoute: beskyttede valg kræver auth.status og auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ukendt valg "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: ukendt filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: stifilter "{{filter}}" kræver param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: stifilter "{{filter}}" kan ikke fjernes',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ændring af stiparametre kræver et stimønster',
  'routing.listRoute.error.page': 'useListRoute: page skal være et positivt sikkert heltal',
  'routing.sveltekit.error.serverHistory':
    'historikbevægelser er kun tilgængelige i browseren: SvelteKit-klientrouteren kører ikke under gengivelse på serversiden',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` skal kaldes i en injektionskontekst for en Angular-app, der leverer routeren. Tilføj `provideRouter(routes)` til appens providere.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` skal kaldes i `setup` i en komponent i en Vue-app med Vue Router installeret. Installer det med `app.use(router)`.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` skal bruges i en Solid Router-router. Monter `Router`, `HashRouter` eller `MemoryRouter`.',
  'routing.sveltekit.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` skal bruges i en `MoleculeRouterProvider`. Monter `MoleculeRouterProvider` i dit rodlayout omkring siden.',
}
