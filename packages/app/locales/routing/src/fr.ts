import type { RoutingTranslations } from './types.js'

/** Routing translations for fr. */
export const fr: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Paramètre "{{name}}" manquant pour le chemin "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" introuvable',
  'routing.error.useMoleculeRouterOutsideProvider':
    "La fonction useMoleculeRouter doit être utilisée au sein d'un MoleculeRouterProvider.",
}
