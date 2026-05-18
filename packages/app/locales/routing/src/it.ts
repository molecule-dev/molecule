import type { RoutingTranslations } from './types.js'

/** Routing translations for it. */
export const it: Partial<RoutingTranslations> = {
  'routing.error.missingParam': 'Parametro "{{name}}" mancante per il percorso "{{pattern}}"',
  'routing.error.routeNotFound': 'Percorso "{{name}}" non trovato',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter deve essere utilizzato all&#39;interno di un MoleculeRouterProvider',
}
