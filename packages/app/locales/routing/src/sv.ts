import type { RoutingTranslations } from './types.js'

/** Routing translations for Swedish. */
export const sv: RoutingTranslations = {
  'routing.error.missingParam': 'Saknad parameter "{{name}}" för sökväg "{{pattern}}"',
  'routing.error.routeNotFound': 'Rutten "{{name}}" hittades inte',
  'routing.error.noNavigationRef':
    'Navigeringsreferensen är inte angiven. Se till att `MoleculeProvider` är monterad.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` måste användas i en React Router-router. Montera `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` eller `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router-historiken användes innan dess komponent renderades. Montera den i en React Router-router via MoleculeRouterProvider eller useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize måste vara ett positivt säkert heltal',
  'routing.listRoute.error.authRequired':
    'useListRoute: skyddade val kräver auth.status och auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: okänt val "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: okänt filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: vägfilter "{{filter}}" kräver param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: vägfiltret "{{filter}}" kan inte tas bort',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ändring av vägparametrar kräver ett vägmönster',
  'routing.listRoute.error.page': 'useListRoute: page måste vara ett positivt säkert heltal',
  'routing.sveltekit.error.serverHistory':
    'historikförflyttningar är bara tillgängliga i webbläsaren: SvelteKits klientrouter körs inte under rendering på serversidan',
}
