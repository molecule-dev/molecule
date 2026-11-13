import type { RoutingTranslations } from './types.js'

/** Routing translations for Kazakh. */
export const kk: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" жолы үшін "{{pattern}}" параметрі жоқ',
  'routing.error.routeNotFound': '"{{name}}" маршруты табылмады',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter MoleculeRouterProvider ішінде қолданылуы керек',
  'routing.error.noNavigationRef':
    'Навигация сілтемесі орнатылмаған. `MoleculeProvider` орнатылғанына көз жеткізіңіз.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router маршрутизаторында пайдаланылуы керек. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` немесе `RouterProvider` орнатыңыз.',
}
