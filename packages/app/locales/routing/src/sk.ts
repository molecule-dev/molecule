import type { RoutingTranslations } from './types.js'

/** Routing translations for Slovak. */
export const sk: RoutingTranslations = {
  'routing.error.missingParam': 'Chýbajúci parameter "{{name}}" pre cestu "{{pattern}}"',
  'routing.error.routeNotFound': 'Cesta "{{name}}" nebola nájdená',
  'routing.error.noNavigationRef':
    'Navigačný odkaz nie je nastavený. Uistite sa, že je pripojený `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` sa musí použiť v rámci routera React Router. Pripojte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` alebo `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'História React Router bola použitá pred vykreslením jej komponenty. Pripojte ju v rámci routeru React Router prostredníctvom MoleculeRouterProvider alebo useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize musí byť kladné bezpečné celé číslo',
  'routing.listRoute.error.authRequired':
    'useListRoute: chránené selekcie vyžadujú auth.status a auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: neznáma selekcia "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: neznámy filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filter cesty "{{filter}}" vyžaduje parameter "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filter cesty "{{filter}}" nie je možné odobrať',
  'routing.listRoute.error.pathPattern': 'useListRoute: zmena parametrov cesty vyžaduje vzor cesty',
  'routing.listRoute.error.page': 'useListRoute: page musí byť kladné bezpečné celé číslo',
  'routing.sveltekit.error.serverHistory':
    'posuny v histórii sú k dispozícii iba v prehliadači: klientský router SvelteKit sa pri vykresľovaní na serveri nespúšťa',
}
