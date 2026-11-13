import type { RoutingTranslations } from './types.js'

/** Routing translations for Kyrgyz. */
export const ky: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" жолу үчүн "{{pattern}}" параметри жок',
  'routing.error.routeNotFound': '"{{name}}" маршруту табылган жок',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider ичинде колдонулушу керек',
  'routing.error.noNavigationRef':
    'Навигация шилтемеси коюлган эмес. `MoleculeProvider` орнотулганын текшериңиз.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router роутеринде колдонулушу керек. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` же `RouterProvider` орнотуңуз.',
}
