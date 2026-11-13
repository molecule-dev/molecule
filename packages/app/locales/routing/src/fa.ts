import type { RoutingTranslations } from './types.js'

/** Routing translations for Persian. */
export const fa: RoutingTranslations = {
  'routing.error.missingParam': 'پارامتر "{{name}}" برای مسیر "{{pattern}}" وجود ندارد',
  'routing.error.routeNotFound': 'مسیر "{{name}}" یافت نشد',
  'routing.error.noNavigationRef':
    'مرجع ناوبری تنظیم نشده است. مطمئن شوید که `MoleculeProvider` نصب شده است.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` باید درون یک روتر React Router استفاده شود. `BrowserRouter` ، `HashRouter` ، `MemoryRouter` ، `Router` یا `RouterProvider` را نصب کنید.',
  'routing.error.reactRouterHistoryBeforeRender':
    'تاریخچه React Router پیش از رندر شدن کامپوننتش استفاده شد. آن را از طریق MoleculeRouterProvider یا useMoleculeRouter درون یک روتر React Router نصب کنید.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize باید یک عدد صحیح امن مثبت باشد',
  'routing.listRoute.error.authRequired':
    'useListRoute: انتخاب‌های محافظت‌شده به auth.status و auth.redirectTo نیاز دارند',
  'routing.listRoute.error.unknownSelection': 'useListRoute: انتخاب ناشناخته "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: فیلتر ناشناخته "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: فیلتر مسیر "{{filter}}" به پارامتر "{{param}}" نیاز دارد',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: فیلتر مسیر "{{filter}}" را نمی‌توان حذف کرد',
  'routing.listRoute.error.pathPattern':
    'useListRoute: تغییر پارامترهای مسیر به یک الگوی مسیر نیاز دارد',
  'routing.listRoute.error.page': 'useListRoute: page باید یک عدد صحیح امن مثبت باشد',
  'routing.sveltekit.error.serverHistory':
    'جابه‌جایی‌های تاریخچه فقط در مرورگر در دسترس است: روتر کلاینت SvelteKit هنگام رندر سمت سرور اجرا نمی‌شود',
}
