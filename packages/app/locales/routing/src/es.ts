import type { RoutingTranslations } from './types.js'

/** Routing translations for Spanish. */
export const es: RoutingTranslations = {
  'routing.error.missingParam': 'Falta el parámetro "{{name}}" para la ruta "{{pattern}}"',
  'routing.error.routeNotFound': 'Ruta "{{name}}" no encontrada',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter debe usarse dentro de un MoleculeRouterProvider',
}
