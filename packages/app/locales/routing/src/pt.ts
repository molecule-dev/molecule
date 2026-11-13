import type { RoutingTranslations } from './types.js'

/** Routing translations for Portuguese. */
export const pt: RoutingTranslations = {
  'routing.error.missingParam': 'Parâmetro "{{name}}" ausente para o caminho "{{pattern}}"',
  'routing.error.routeNotFound': 'Rota "{{name}}" não encontrada',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter deve ser usado dentro de um MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Referência de navegação não definida. Certifique-se de que `MoleculeProvider` esteja montado.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` deve ser usado dentro de um roteador do React Router. Monte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ou `RouterProvider`.',
}
