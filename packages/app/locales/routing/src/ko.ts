import type { RoutingTranslations } from './types.js'

/** Routing translations for Korean. */
export const ko: RoutingTranslations = {
  'routing.error.missingParam': '경로 "{{pattern}}"에 대한 매개변수 "{{name}}"이(가) 없습니다',
  'routing.error.routeNotFound': '"{{name}}" 경로를 찾을 수 없습니다',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter는 MoleculeRouterProvider 내에서 사용해야 합니다',
}
