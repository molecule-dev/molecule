import type { RoutingTranslations } from './types.js'

/** Routing translations for Korean. */
export const ko: RoutingTranslations = {
  'routing.error.missingParam': '경로 "{{name}}"에 대한 매개변수 "{{pattern}}"이(가) 없습니다',
  'routing.error.routeNotFound': '"{{name}}" 경로를 찾을 수 없습니다',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter는 MoleculeRouterProvider 내에서 사용해야 합니다',
  'routing.error.noNavigationRef':
    '내비게이션 참조가 설정되지 않았습니다. `MoleculeProvider` 마운트되었는지 확인하십시오.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router 라우터 내에서 사용해야 합니다. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` 또는 `RouterProvider` 마운트하세요.',
}
