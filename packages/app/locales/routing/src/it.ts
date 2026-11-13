import type { RoutingTranslations } from './types.js'

/** Routing translations for it. */
export const it: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Parametro "{{name}}" mancante per il percorso "{{pattern}}"',
  'routing.error.routeNotFound': 'Percorso "{{name}}" non trovato',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter deve essere utilizzato all'interno di un MoleculeRouterProvider",
  'routing.error.noNavigationRef':
    'Riferimento di navigazione non impostato. Assicurarsi che `MoleculeProvider` sia montato.',
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` deve essere utilizzato all'interno di un router React Router. Monta `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` o `RouterProvider`.",
}
