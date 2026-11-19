import type { RoutingTranslations } from './types.js'

/** Routing translations for Arabic. */
export const ar: RoutingTranslations = {
  'routing.error.missingParam': 'المعامل "{{name}}" مفقود للمسار "{{pattern}}"',
  'routing.error.routeNotFound': 'المسار "{{name}}" غير موجود',
  'routing.error.noNavigationRef': 'لم يتم تعيين مرجع التنقل. تأكد من تثبيت `MoleculeProvider` .',
  'routing.error.useMoleculeRouterOutsideRouter':
    'يجب استخدام `useMoleculeRouter` داخل موجه React Router. قم بتثبيت `BrowserRouter` أو `HashRouter` أو `MemoryRouter` أو `Router` أو `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'تم استخدام سجل React Router قبل عرض مكوّنه. ثبّته داخل موجّه React Router عبر MoleculeRouterProvider أو useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: يجب أن يكون pageSize عددًا صحيحًا آمنًا موجبًا',
  'routing.listRoute.error.authRequired':
    'useListRoute: تتطلب الاختيارات المحمية auth.status و auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: اختيار غير معروف "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: مرشّح غير معروف "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: مرشّح المسار "{{filter}}" يتطلب معاملًا "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: لا يمكن إزالة مرشّح المسار "{{filter}}"',
  'routing.listRoute.error.pathPattern': 'useListRoute: تغيير معاملات المسار يتطلب نمط مسار',
  'routing.listRoute.error.page': 'useListRoute: يجب أن يكون page عددًا صحيحًا آمنًا موجبًا',
  'routing.sveltekit.error.serverHistory':
    'حركات السجل متاحة في المتصفح فقط: موجّه عميل SvelteKit لا يعمل أثناء التصيير من جهة الخادم',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    'يجب استدعاء `useMoleculeRouter` في سياق حقن لتطبيق Angular يوفر الموجه. أضف `provideRouter(routes)` إلى موفري التطبيق.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    'يجب استدعاء `useMoleculeRouter` داخل `setup` لمكوّن في تطبيق Vue مثبت عليه Vue Router. ثبّته باستخدام `app.use(router)`.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    'يجب استخدام `useMoleculeRouter` داخل موجه Solid Router. قم بتثبيت `Router` أو `HashRouter` أو `MemoryRouter`.',
}
