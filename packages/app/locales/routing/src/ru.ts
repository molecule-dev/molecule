import type { RoutingTranslations } from './types.js'

/** Routing translations for Russian. */
export const ru: RoutingTranslations = {
  'routing.error.missingParam': 'Отсутствует параметр "{{name}}" для пути "{{pattern}}"',
  'routing.error.routeNotFound': 'Маршрут "{{name}}" не найден',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter должен использоваться внутри MoleculeRouterProvider',
}
