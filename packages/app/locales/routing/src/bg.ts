import type { RoutingTranslations } from './types.js'

/** Routing translations for Bulgarian. */
export const bg: RoutingTranslations = {
  'routing.error.missingParam': 'Липсващ параметър "{{name}}" за път "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрутът "{{name}}" не е намерен',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter трябва да се използва в MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Навигационната препратка не е зададена. Уверете се, че `MoleculeProvider` е монтиран.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` трябва да се използва в рутер на React Router. Монтирайте `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` или `RouterProvider`.',
}
