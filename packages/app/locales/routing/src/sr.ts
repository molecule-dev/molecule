import type { RoutingTranslations } from './types.js'

/** Routing translations for Serbian. */
export const sr: RoutingTranslations = {
  'routing.error.missingParam': 'Недостаје параметар "{{name}}" за путању "{{pattern}}"',
  'routing.error.routeNotFound': 'Путања "{{name}}" није пронађена',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter мора да се користи унутар MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Референца за навигацију није подешена. Уверите се да је `MoleculeProvider` монтиран.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` мора да се користи унутар React Router рутера. Монтирајте `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
}
