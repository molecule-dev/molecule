import type { RoutingTranslations } from './types.js'

/** Routing translations for Basque. */
export const eu: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" parametroa falta da "{{pattern}}" biderako',
  'routing.error.routeNotFound': '"{{name}}" bidea ez da aurkitu',
  'routing.error.noNavigationRef':
    'Nabigazio erreferentzia ez da ezarri. Ziurtatu `MoleculeProvider` muntatuta dagoela.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router bideratzaile baten barruan erabili behar da. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, edo `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router historia bere osagaia errendatu aurretik erabili da. Muntatu MoleculeRouterProvider edo useMoleculeRouter bidez React Router bideratzaile baten barruan.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize-k osoko zenbaki seguru positibo bat izan behar du',
  'routing.listRoute.error.authRequired':
    'useListRoute: hautapen babestuek auth.status eta auth.redirectTo eskatzen dituzte',
  'routing.listRoute.error.unknownSelection': 'useListRoute: hautapen ezezaguna "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: iragazki ezezaguna "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: bide-iragazkiak "{{filter}}" param "{{param}}" eskatzen du',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: bide-iragazkia "{{filter}}" ezin da kendu',
  'routing.listRoute.error.pathPattern':
    'useListRoute: bide-parametroak aldatzeak bide-eredu bat eskatzen du',
  'routing.listRoute.error.page':
    'useListRoute: page-k osoko zenbaki seguru positibo bat izan behar du',
  'routing.sveltekit.error.serverHistory':
    'historia-mugimendak nabigatzailean soilik erabil daitezke: SvelteKit bezero-bideratzailea ez da exekutatzen zerbitzari aldeko errendatzean',
}
