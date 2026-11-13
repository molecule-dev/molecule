import type { RoutingTranslations } from './types.js'

/** Routing translations for fr. */
export const fr: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Paramètre "{{name}}" manquant pour le chemin "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" introuvable',
  'routing.error.noNavigationRef':
    'Référence de navigation non définie. Assurez-vous que `MoleculeProvider` est monté.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` doit être utilisée dans un routeur React Router. Montez `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` ou `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    "L'historique de React Router a été utilisé avant le rendu de son composant. Montez-le dans un routeur React Router via MoleculeRouterProvider ou useMoleculeRouter.",
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize doit être un entier sûr positif',
  'routing.listRoute.error.authRequired':
    'useListRoute: les sélections protégées exigent auth.status et auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: sélection inconnue "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filtre inconnu "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: le filtre de chemin "{{filter}}" exige le param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: le filtre de chemin "{{filter}}" ne peut pas être supprimé',
  'routing.listRoute.error.pathPattern':
    'useListRoute: modifier les paramètres de chemin exige un motif de chemin',
  'routing.listRoute.error.page': 'useListRoute: page doit être un entier sûr positif',
  'routing.sveltekit.error.serverHistory':
    "les mouvements d'historique ne sont disponibles que dans le navigateur : le routeur client de SvelteKit ne s'exécute pas pendant le rendu côté serveur",
}
