import type { RoutingTranslations } from './types.js'

/** Routing translations for Polish. */
export const pl: RoutingTranslations = {
  'routing.error.missingParam': 'Brakujący parametr "{{name}}" dla ścieżki "{{pattern}}"',
  'routing.error.routeNotFound': 'Trasa "{{name}}" nie została znaleziona',
  'routing.error.noNavigationRef':
    'Odwołanie nawigacyjne nie zostało ustawione. Upewnij się, że `MoleculeProvider` jest zamontowany.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` musi być używany w routerze React Router. Zamontuj `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` lub `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Historia React Router została użyta, zanim jej komponent został wyrenderowany. Zamontuj ją wewnątrz routera React Router za pomocą MoleculeRouterProvider lub useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize musi być dodatnią bezpieczną liczbą całkowitą',
  'routing.listRoute.error.authRequired':
    'useListRoute: chronione selekcje wymagają auth.status i auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: nieznana selekcja "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: nieznany filtr "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filtr ścieżki "{{filter}}" wymaga parametru "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filtru ścieżki "{{filter}}" nie można usunąć',
  'routing.listRoute.error.pathPattern':
    'useListRoute: zmiana parametrów ścieżki wymaga wzorca ścieżki',
  'routing.listRoute.error.page':
    'useListRoute: page musi być dodatnią bezpieczną liczbą całkowitą',
  'routing.sveltekit.error.serverHistory':
    'przesunięcia w historii są dostępne tylko w przeglądarce: router klienta SvelteKit nie działa podczas renderowania po stronie serwera',
}
