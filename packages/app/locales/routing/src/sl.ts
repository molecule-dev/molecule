import type { RoutingTranslations } from './types.js'

/** Routing translations for Slovenian. */
export const sl: RoutingTranslations = {
  'routing.error.missingParam': 'Manjkajoč parameter "{{name}}" za pot "{{pattern}}"',
  'routing.error.routeNotFound': 'Pot "{{name}}" ni bila najdena',
  'routing.error.noNavigationRef':
    'Navigacijska referenca ni nastavljena. Prepričajte se, da je `MoleculeProvider` nameščen.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` mora biti uporabljen znotraj usmerjevalnika React Router. Priklopite `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ali `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Zgodovina React Router je bila uporabljena, preden se je upodobila njena komponenta. Priklopite jo znotraj usmerjevalnika React Router prek MoleculeRouterProvider ali useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize mora biti pozitivno varno celo število',
  'routing.listRoute.error.authRequired':
    'useListRoute: zaščitene izbire zahtevajo auth.status in auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: neznana izbira "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: neznan filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filter poti "{{filter}}" zahteva parameter "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filtra poti "{{filter}}" ni mogoče odstraniti',
  'routing.listRoute.error.pathPattern':
    'useListRoute: spreminjanje parametrov poti zahteva vzorec poti',
  'routing.listRoute.error.page': 'useListRoute: page mora biti pozitivno varno celo število',
  'routing.sveltekit.error.serverHistory':
    'premiki po zgodovini so na voljo samo v brskalniku: odjemalski usmerjevalnik SvelteKit se ne izvaja med upodabljanjem na strežniku',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` je treba klicati v kontekstu injiciranja aplikacije Angular, ki zagotavlja usmerjevalnik. Dodajte `provideRouter(routes)` med ponudnike aplikacije.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` je treba klicati v `setup` komponente aplikacije Vue z nameščenim Vue Router. Namestite ga z `app.use(router)`.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` mora biti uporabljen znotraj usmerjevalnika Solid Router. Priklopite `Router`, `HashRouter` ali `MemoryRouter`.',
  'routing.sveltekit.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` mora biti uporabljen znotraj `MoleculeRouterProvider`. Priklopite `MoleculeRouterProvider` v korenski postavitvi okoli strani.',
}
