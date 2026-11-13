import type { RoutingTranslations } from './types.js'

/** Routing translations for Persian. */
export const fa: RoutingTranslations = {
  'routing.error.missingParam': 'پارامتر "{{name}}" برای مسیر "{{pattern}}" وجود ندارد',
  'routing.error.routeNotFound': 'مسیر "{{name}}" یافت نشد',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter باید درون MoleculeRouterProvider استفاده شود',
  'routing.error.noNavigationRef':
    'مرجع ناوبری تنظیم نشده است. مطمئن شوید که `MoleculeProvider` نصب شده است.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` باید درون یک روتر React Router استفاده شود. `BrowserRouter` ، `HashRouter` ، `MemoryRouter` ، `Router` یا `RouterProvider` را نصب کنید.',
}
