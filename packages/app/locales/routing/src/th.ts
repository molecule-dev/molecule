import type { RoutingTranslations } from './types.js'

/** Routing translations for Thai. */
export const th: RoutingTranslations = {
  'routing.error.missingParam': 'พารามิเตอร์ "{{name}}" หายไปสำหรับเส้นทาง "{{pattern}}"',
  'routing.error.routeNotFound': 'ไม่พบเส้นทาง "{{name}}"',
  'routing.error.noNavigationRef':
    'ไม่ได้ตั้งค่า Navigation ref โปรดตรวจสอบให้แน่ใจว่าได้ติดตั้ง `MoleculeProvider` แล้ว',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ต้องใช้ภายในเราเตอร์ React Router เท่านั้น ต้องทำการ Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` หรือ `RouterProvider`',
  'routing.error.reactRouterHistoryBeforeRender':
    'มีการใช้ React Router history ก่อนที่คอมโพเนนต์ของมันจะถูกเรนเดอร์ ทำการ Mount ภายในเราเตอร์ React Router ผ่าน MoleculeRouterProvider หรือ useMoleculeRouter',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize ต้องเป็นจำนวนเต็มที่ปลอดภัยและเป็นบวก',
  'routing.listRoute.error.authRequired':
    'useListRoute: การเลือกที่มีการป้องกันต้องใช้ auth.status และ auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: การเลือกที่ไม่รู้จัก "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: ตัวกรองที่ไม่รู้จัก "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ตัวกรองพาธ "{{filter}}" ต้องการ param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ตัวกรองพาธ "{{filter}}" ไม่สามารถลบออกได้',
  'routing.listRoute.error.pathPattern': 'useListRoute: การเปลี่ยนพารามิเตอร์พาธต้องใช้รูปแบบพาธ',
  'routing.listRoute.error.page': 'useListRoute: page ต้องเป็นจำนวนเต็มที่ปลอดภัยและเป็นบวก',
  'routing.sveltekit.error.serverHistory':
    'การเคลื่อนที่ของ history ใช้ได้ในเบราว์เซอร์เท่านั้น: เราเตอร์ฝั่ง client ของ SvelteKit ไม่ทำงานระหว่างการเรนเดอร์ฝั่ง server',
}
