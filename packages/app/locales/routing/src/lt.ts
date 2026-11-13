import type { RoutingTranslations } from './types.js'

/** Routing translations for Lithuanian. */
export const lt: RoutingTranslations = {
  'routing.error.missingParam': 'Trūksta parametro "{{name}}" keliui "{{pattern}}"',
  'routing.error.routeNotFound': 'Maršrutas "{{name}}" nerastas',
  'routing.error.noNavigationRef':
    'Navigacijos nuoroda nenustatyta. Įsitikinkite, kad prijungtas `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    '„React Router“ maršrutizatoriuje turi būti naudojamas `useMoleculeRouter` . Prijunkite `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` arba `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router istorija buvo naudota, kol dar nebuvo atvaizduotas jos komponentas. Prijunkite ją React Router maršrutizatoriuje naudodami MoleculeRouterProvider arba useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize turi būti teigiamas saugus sveikasis skaičius',
  'routing.listRoute.error.authRequired':
    'useListRoute: apsaugotiems pasirinkimams reikia auth.status ir auth.redirectTo',
  'routing.listRoute.error.unknownSelection':
    'useListRoute: neatpažintas pasirinkimas "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: neatpažintas filtras "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: kelio filtras "{{filter}}" reikalauja parametro "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: kelio filtro "{{filter}}" negalima pašalinti',
  'routing.listRoute.error.pathPattern':
    'useListRoute: kelio parametrų keitimas reikalauja kelio šablono',
  'routing.listRoute.error.page':
    'useListRoute: page turi būti teigiamas saugus sveikasis skaičius',
  'routing.sveltekit.error.serverHistory':
    'istorijos perkėlimai prieinami tik naršyklėje: SvelteKit kliento maršrutizatorius neveikia atvaizduojant serveryje',
}
