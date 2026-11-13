import type { RoutingTranslations } from './types.js'

/** Routing translations for Arabic. */
export const ar: RoutingTranslations = {
  'routing.error.missingParam': 'المعامل "{{name}}" مفقود للمسار "{{pattern}}"',
  'routing.error.routeNotFound': 'المسار "{{name}}" غير موجود',
  'routing.error.useMoleculeRouterOutsideProvider':
    'يجب استخدام useMoleculeRouter داخل MoleculeRouterProvider',
  'routing.error.noNavigationRef': 'لم يتم تعيين مرجع التنقل. تأكد من تثبيت `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    'يجب استخدام `useMoleculeRouter` داخل موجه React Router. قم بتثبيت `BrowserRouter` أو `HashRouter` أو `MemoryRouter` أو `Router` أو `RouterProvider`.',
}
