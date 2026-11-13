import type { RoutingTranslations } from './types.js'

/** Routing translations for Thai. */
export const th: RoutingTranslations = {
  'routing.error.missingParam': 'พารามิเตอร์ "{{name}}" หายไปสำหรับเส้นทาง "{{pattern}}"',
  'routing.error.routeNotFound': 'ไม่พบเส้นทาง "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ต้องใช้ภายใน MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'ไม่ได้ตั้งค่า Navigation ref โปรดตรวจสอบให้แน่ใจว่าได้ติดตั้ง `MoleculeProvider` แล้ว',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ต้องใช้ภายในเราเตอร์ React Router เท่านั้น ต้องทำการ Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` หรือ `RouterProvider`',
}
