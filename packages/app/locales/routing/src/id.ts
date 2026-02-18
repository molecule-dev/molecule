import type { RoutingTranslations } from './types.js'

/** Routing translations for Indonesian. */
export const id: RoutingTranslations = {
  'routing.error.missingParam': 'Parameter "{{name}}" tidak ditemukan untuk path "{{pattern}}"',
  'routing.error.routeNotFound': 'Rute "{{name}}" tidak ditemukan',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter harus digunakan di dalam MoleculeRouterProvider',
}
