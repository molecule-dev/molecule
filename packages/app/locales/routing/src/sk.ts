import type { RoutingTranslations } from './types.js'

/** Routing translations for Slovak. */
export const sk: RoutingTranslations = {
  'routing.error.missingParam': 'Chýbajúci parameter "{{name}}" pre cestu "{{pattern}}"',
  'routing.error.routeNotFound': 'Cesta "{{name}}" nebola nájdená',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter sa musí použiť vo vnútri MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Navigačný odkaz nie je nastavený. Uistite sa, že je pripojený `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` sa musí použiť v rámci routera React Router. Pripojte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` alebo `RouterProvider`.',
}
