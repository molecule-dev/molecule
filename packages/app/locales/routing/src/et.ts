import type { RoutingTranslations } from './types.js'

/** Routing translations for Estonian. */
export const et: RoutingTranslations = {
  'routing.error.missingParam': 'Puuduv parameeter "{{name}}" teekonna "{{pattern}}" jaoks',
  'routing.error.routeNotFound': 'Marsruuti "{{name}}" ei leitud',
  'routing.error.noNavigationRef':
    'Navigeerimisviidet pole määratud. Veenduge, et `MoleculeProvider` on ühendatud.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Routeri ruuteri sees tuleb kasutada `useMoleculeRouter` . Paigaldage `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` või `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Routeri ajalugu kasutati enne selle komponendi renderdamist. Paigaldage see MoleculeRouterProvider või useMoleculeRouter kaudu React Routeri ruuteri sisse.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize peab olema positiivne turvaline täisarv',
  'routing.listRoute.error.authRequired':
    'useListRoute: kaitstud valikud nõuavad auth.status ja auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: tundmatu valik "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: tundmatu filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: teefilter "{{filter}}" nõuab parameetrit "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: teefilterit "{{filter}}" ei saa eemaldada',
  'routing.listRoute.error.pathPattern': 'useListRoute: teeparametrite muutmine nõuab teemustrit',
  'routing.listRoute.error.page': 'useListRoute: page peab olema positiivne turvaline täisarv',
  'routing.sveltekit.error.serverHistory':
    'ajaloo liikumised on saadaval ainult brauseris: SvelteKiti kliendipoolne ruuter ei tööta serveripoolsel renderdamisel',
}
