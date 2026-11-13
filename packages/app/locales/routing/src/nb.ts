import type { RoutingTranslations } from './types.js'

/** Routing translations for Norwegian Bokmål. */
export const nb: RoutingTranslations = {
  'routing.error.missingParam': 'Manglende parameter "{{name}}" for sti "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruten "{{name}}" ble ikke funnet',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter må brukes innenfor en MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Navigasjonsreferansen er ikke angitt. Sørg for at `MoleculeProvider` er montert.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` må brukes i en React Router-ruter. Monter `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` eller `RouterProvider`.',
}
