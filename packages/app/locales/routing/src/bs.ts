import type { RoutingTranslations } from './types.js'

/** Routing translations for Bosnian. */
export const bs: RoutingTranslations = {
  'routing.error.missingParam': 'Nedostaje parametar "{{name}}" za putanju "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nije pronađena',
  'routing.error.noNavigationRef':
    'Navigacijska referenca nije postavljena. Provjerite je li `MoleculeProvider` montiran.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` se mora koristiti unutar React Router rutera. Montirajte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ili `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router historija je korištena prije nego što se njezina komponenta prikazala. Montirajte je unutar React Router rutera putem MoleculeRouterProvider ili useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize mora biti pozitivan siguran cijeli broj',
  'routing.listRoute.error.authRequired':
    'useListRoute: zaštićene selekcije zahtijevaju auth.status i auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: nepoznata selekcija "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: nepoznat filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filter putanje "{{filter}}" zahtijeva parametar "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filter putanje "{{filter}}" se ne može ukloniti',
  'routing.listRoute.error.pathPattern':
    'useListRoute: promjena parametara putanje zahtijeva obrazac putanje',
  'routing.listRoute.error.page': 'useListRoute: page mora biti pozitivan siguran cijeli broj',
  'routing.sveltekit.error.serverHistory':
    'pomaci po historiji su dostupni samo u pregledniku: SvelteKit klijentski ruter ne radi tijekom renderiranja na serveru',
}
