import type { RoutingTranslations } from './types.js'

/** Routing translations for Macedonian. */
export const mk: RoutingTranslations = {
  'routing.error.missingParam': 'Недостасува параметар "{{name}}" за патеката "{{pattern}}"',
  'routing.error.routeNotFound': 'Патеката "{{name}}" не е пронајдена',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter мора да се користи внатре во MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Референцата за навигација не е поставена. Проверете дали `MoleculeProvider` е монтиран.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` мора да се користи во рамките на рутерот на React Router. Монтирајте го `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
}
