import type { RoutingTranslations } from './types.js'

/** Routing translations for English. */
export const en: RoutingTranslations = {
  'routing.error.missingParam': 'Missing param "{{name}}" for path "{{pattern}}"',
  'routing.error.routeNotFound': 'Route "{{name}}" not found',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter must be used within a MoleculeRouterProvider',
}
