import type { RoutingTranslations } from './types.js'

/** Routing translations for French. */
export const fr: RoutingTranslations = {
  'routing.error.missingParam': 'Paramètre "{{name}}" manquant pour le chemin "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" introuvable',
  'routing.error.useMoleculeRouterOutsideProvider':
    "useMoleculeRouter doit être utilisé à l'intérieur d'un MoleculeRouterProvider",
}
