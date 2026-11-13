import type { RoutingTranslations } from './types.js'

/** Routing translations for Vietnamese. */
export const vi: RoutingTranslations = {
  'routing.error.missingParam': 'Thiếu tham số "{{name}}" cho đường dẫn "{{pattern}}"',
  'routing.error.routeNotFound': 'Không tìm thấy tuyến đường "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter phải được sử dụng bên trong MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'Tham chiếu điều hướng chưa được thiết lập. Hãy đảm bảo rằng `MoleculeProvider` đã được gắn kết.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` phải được sử dụng bên trong một bộ định tuyến React Router. Gắn `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` hoặc `RouterProvider`.',
}
