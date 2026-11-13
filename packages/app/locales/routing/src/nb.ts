import type { RoutingTranslations } from './types.js'

/** Routing translations for Norwegian Bokmål. */
export const nb: RoutingTranslations = {
  'routing.error.missingParam': 'Manglende parameter "{{name}}" for sti "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruten "{{name}}" ble ikke funnet',
  'routing.error.noNavigationRef':
    'Navigasjonsreferansen er ikke angitt. Sørg for at `MoleculeProvider` er montert.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` må brukes i en React Router-ruter. Monter `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` eller `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router-historien ble brukt før komponenten ble rendret. Monter den i en React Router-router via MoleculeRouterProvider eller useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize må være et positivt trygt heltall',
  'routing.listRoute.error.authRequired':
    'useListRoute: beskyttede valg krever auth.status og auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ukjent valg "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: ukjent filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: stifilter "{{filter}}" krever param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: stifilter "{{filter}}" kan ikke fjernes',
  'routing.listRoute.error.pathPattern':
    'useListRoute: endring av stiparametere krever et stimønster',
  'routing.listRoute.error.page': 'useListRoute: page må være et positivt trygt heltall',
  'routing.sveltekit.error.serverHistory':
    'historikkbevegelser er bare tilgjengelige i nettleseren: SvelteKit-klientruteren kjøres ikke under gjengivelse på serversiden',
}
