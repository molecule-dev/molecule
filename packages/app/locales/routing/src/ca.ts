import type { RoutingTranslations } from './types.js'

/** Routing translations for ca. */
export const ca: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Falta el paràmetre "{{name}}" per al camí "{{pattern}}"',
  'routing.error.routeNotFound': 'La ruta "{{name}}" no s\'ha trobat',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter s&#39;ha d&#39;utilitzar dins d&#39;un MoleculeRouterProvider.',
}
