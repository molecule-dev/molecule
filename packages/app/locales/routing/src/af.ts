import type { RoutingTranslations } from './types.js'

/** Routing translations for af. */
export const af: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Ontbrekende parameter "{{name}}" vir pad "{{pattern}}"',
  'routing.error.routeNotFound': 'Roete "{{name}}" nie gevind nie',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter moet binne 'n MoleculeRouterProvider gebruik word.",
  'routing.error.noNavigationRef':
    'Navigasieverwysing nie gestel nie. Maak seker dat `MoleculeProvider` gemonteer is.',
  'routing.error.useMoleculeRouterOutsideRouter':
    "`useMoleculeRouter` moet binne 'n React Router-router gebruik word. Monteer `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` of `RouterProvider`.",
}
