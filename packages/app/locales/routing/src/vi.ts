import type { RoutingTranslations } from './types.js'

/** Routing translations for Vietnamese. */
export const vi: RoutingTranslations = {
  'routing.error.missingParam': 'Thiếu tham số "{{name}}" cho đường dẫn "{{pattern}}"',
  'routing.error.routeNotFound': 'Không tìm thấy tuyến đường "{{name}}"',
  'routing.error.noNavigationRef':
    'Tham chiếu điều hướng chưa được thiết lập. Hãy đảm bảo rằng `MoleculeProvider` đã được gắn kết.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` phải được sử dụng bên trong một bộ định tuyến React Router. Gắn `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` hoặc `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'History của React Router được sử dụng trước khi component của nó được kết xuất. Gắn nó bên trong một bộ định tuyến React Router thông qua MoleculeRouterProvider hoặc useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize phải là số nguyên an toàn dương',
  'routing.listRoute.error.authRequired':
    'useListRoute: các lựa chọn được bảo vệ yêu cầu auth.status và auth.redirectTo',
  'routing.listRoute.error.unknownSelection':
    'useListRoute: lựa chọn không xác định "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: bộ lọc không xác định "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: bộ lọc đường dẫn "{{filter}}" yêu cầu param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: bộ lọc đường dẫn "{{filter}}" không thể bị xóa',
  'routing.listRoute.error.pathPattern':
    'useListRoute: thay đổi tham số đường dẫn yêu cầu một mẫu đường dẫn',
  'routing.listRoute.error.page': 'useListRoute: page phải là số nguyên an toàn dương',
  'routing.sveltekit.error.serverHistory':
    'các thao tác history chỉ khả dụng trong trình duyệt: bộ định tuyến client của SvelteKit không chạy trong quá trình kết xuất phía máy chủ',
}
