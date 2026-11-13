import type { RoutingTranslations } from './types.js'

/** Routing translations for Croatian. */
export const hr: RoutingTranslations = {
  'routing.error.missingParam': 'Nedostaje parametar "{{name}}" za putanju "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" nije pronađena',
  'routing.error.noNavigationRef':
    'Navigacijska referenca nije postavljena. Provjerite je li `MoleculeProvider` montiran.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` se mora koristiti unutar React Router usmjerivača. Montirajte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ili `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router povijest korištena je prije nego što se njegova komponenta renderirala. Montirajte ga unutar React Router usmjerivača putem MoleculeRouterProvider ili useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize mora biti pozitivan siguran cijeli broj',
  'routing.listRoute.error.authRequired':
    'useListRoute: zaštićene selekcije zahtijevaju auth.status i auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: nepoznata selekcija "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: nepoznat filter "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filter putanje "{{filter}}" zahtijeva parametar "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filter putanje "{{filter}}" ne može se ukloniti',
  'routing.listRoute.error.pathPattern':
    'useListRoute: promjena parametara putanje zahtijeva obrazac putanje',
  'routing.listRoute.error.page': 'useListRoute: page mora biti pozitivan siguran cijeli broj',
  'routing.sveltekit.error.serverHistory':
    'pomaci po povijesti dostupni su samo u pregledniku: SvelteKit klijentski usmjerivač ne radi tijekom renderiranja na serveru',
}
