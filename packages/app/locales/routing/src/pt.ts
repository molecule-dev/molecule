import type { RoutingTranslations } from './types.js'

/** Routing translations for Portuguese. */
export const pt: RoutingTranslations = {
  'routing.error.missingParam': 'Parâmetro "{{name}}" ausente para o caminho "{{pattern}}"',
  'routing.error.routeNotFound': 'Rota "{{name}}" não encontrada',
  'routing.error.noNavigationRef':
    'Referência de navegação não definida. Certifique-se de que `MoleculeProvider` esteja montado.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` deve ser usado dentro de um roteador do React Router. Monte `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ou `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'O history do React Router foi usado antes de seu componente ser renderizado. Monte-o dentro de um roteador do React Router por meio de MoleculeRouterProvider ou useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize deve ser um inteiro seguro positivo',
  'routing.listRoute.error.authRequired':
    'useListRoute: seleções protegidas exigem auth.status e auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: seleção desconhecida "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtro desconhecido "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: o filtro de caminho "{{filter}}" exige o param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: o filtro de caminho "{{filter}}" não pode ser removido',
  'routing.listRoute.error.pathPattern':
    'useListRoute: alterar parâmetros de caminho exige um padrão de caminho',
  'routing.listRoute.error.page': 'useListRoute: page deve ser um inteiro seguro positivo',
  'routing.sveltekit.error.serverHistory':
    'movimentos de history estão disponíveis apenas no navegador: o roteador cliente do SvelteKit não é executado durante a renderização no servidor',
}
