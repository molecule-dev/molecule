import type { RoutingTranslations } from './types.js'

/** Routing translations for Japanese. */
export const ja: RoutingTranslations = {
  'routing.error.missingParam': 'パス "{{pattern}}" のパラメータ "{{name}}" がありません',
  'routing.error.routeNotFound': 'ルート "{{name}}" が見つかりません',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter は MoleculeRouterProvider 内で使用する必要があります',
}
