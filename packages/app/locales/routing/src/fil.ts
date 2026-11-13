import type { RoutingTranslations } from './types.js'

/** Routing translations for Filipino. */
export const fil: RoutingTranslations = {
  'routing.error.missingParam': 'Nawawalang parameter na "{{name}}" para sa path na "{{pattern}}"',
  'routing.error.routeNotFound': 'Hindi nahanap ang ruta na "{{name}}"',
  'routing.error.noNavigationRef':
    'Hindi nakatakda ang navigation ref. Tiyaking naka-mount `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    'Dapat gamitin `useMoleculeRouter` sa loob ng isang React Router router. I-mount ang `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, o `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Ginamit ang React Router history bago ma-render ang bahagi nito. I-mount ito sa loob ng isang React Router router sa pamamagitan ng MoleculeRouterProvider o useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: dapat positibong safe integer ang pageSize',
  'routing.listRoute.error.authRequired':
    'useListRoute: ang mga protektadong selection ay nangangailangan ng auth.status at auth.redirectTo',
  'routing.listRoute.error.unknownSelection':
    'useListRoute: hindi kilalang selection "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: hindi kilalang filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ang path filter "{{filter}}" ay nangangailangan ng param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: hindi matatanggal ang path filter "{{filter}}"',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ang pagbabago ng mga path parameter ay nangangailangan ng path pattern',
  'routing.listRoute.error.page': 'useListRoute: dapat positibong safe integer ang page',
  'routing.sveltekit.error.serverHistory':
    'ang mga history move ay magagamit lamang sa browser: hindi tumatakbo ang SvelteKit client router sa panahon ng server-side rendering',
}
