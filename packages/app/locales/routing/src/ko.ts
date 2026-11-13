import type { RoutingTranslations } from './types.js'

/** Routing translations for Korean. */
export const ko: RoutingTranslations = {
  'routing.error.missingParam': '경로 "{{name}}"에 대한 매개변수 "{{pattern}}"이(가) 없습니다',
  'routing.error.routeNotFound': '"{{name}}" 경로를 찾을 수 없습니다',
  'routing.error.noNavigationRef':
    '내비게이션 참조가 설정되지 않았습니다. `MoleculeProvider` 마운트되었는지 확인하십시오.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router 라우터 내에서 사용해야 합니다. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` 또는 `RouterProvider` 마운트하세요.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router 히스토리가 해당 컴포넌트가 렌더링되기 전에 사용되었습니다. MoleculeRouterProvider 또는 useMoleculeRouter를 통해 React Router 라우터 내부에 마운트하세요.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize는 양수인 안전한 정수여야 합니다',
  'routing.listRoute.error.authRequired':
    'useListRoute: 보호된 선택에는 auth.status와 auth.redirectTo가 필요합니다',
  'routing.listRoute.error.unknownSelection': 'useListRoute: 알 수 없는 선택 "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: 알 수 없는 필터 "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: 경로 필터 "{{filter}}"에는 param "{{param}}"이(가) 필요합니다',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: 경로 필터 "{{filter}}"은(는) 제거할 수 없습니다',
  'routing.listRoute.error.pathPattern':
    'useListRoute: 경로 파라미터를 변경하려면 경로 패턴이 필요합니다',
  'routing.listRoute.error.page': 'useListRoute: page는 양수인 안전한 정수여야 합니다',
  'routing.sveltekit.error.serverHistory':
    '히스토리 이동은 브라우저에서만 사용할 수 있습니다: SvelteKit 클라이언트 라우터는 서버 사이드 렌더링 중에는 실행되지 않습니다',
}
