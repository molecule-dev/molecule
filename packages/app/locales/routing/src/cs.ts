import type { RoutingTranslations } from './types.js'

/** Routing translations for Czech. */
export const cs: RoutingTranslations = {
  'routing.error.missingParam': 'Chybějící parametr "{{name}}" pro cestu "{{pattern}}"',
  'routing.error.routeNotFound': 'Cesta "{{name}}" nebyla nalezena',
  'routing.error.noNavigationRef':
    'Navigační odkaz není nastaven. Ujistěte se, že je připojen objekt `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` musí být použit v rámci routeru React Router. Připojte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` nebo `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Historie React Router byla použita před vykreslením její komponenty. Připojte ji uvnitř routeru React Router prostřednictvím MoleculeRouterProvider nebo useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize musí být kladné bezpečné celé číslo',
  'routing.listRoute.error.authRequired':
    'useListRoute: chráněné selekce vyžadují auth.status a auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: neznámá selekce "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: neznámý filtr "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filtr cesty "{{filter}}" vyžaduje parametr "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filtr cesty "{{filter}}" nelze odebrat',
  'routing.listRoute.error.pathPattern': 'useListRoute: změna parametrů cesty vyžaduje vzor cesty',
  'routing.listRoute.error.page': 'useListRoute: page musí být kladné bezpečné celé číslo',
  'routing.sveltekit.error.serverHistory':
    'přesuny v historii jsou k dispozici pouze v prohlížeči: klientský router SvelteKit při vykreslování na serveru neběží',
}
