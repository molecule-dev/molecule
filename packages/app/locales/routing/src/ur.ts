import type { RoutingTranslations } from './types.js'

/** Routing translations for Urdu. */
export const ur: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" راستے کے لیے "{{pattern}}" پیرامیٹر موجود نہیں',
  'routing.error.routeNotFound': '"{{name}}" راستہ نہیں ملا',
  'routing.error.noNavigationRef':
    'نیویگیشن ریفری سیٹ نہیں ہے۔ یقینی بنائیں کہ `MoleculeProvider` نصب ہے۔',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Router روٹر کے اندر `useMoleculeRouter` استعمال کرنا ضروری ہے۔ ماؤنٹ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, یا `RouterProvider` ۔',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router کی تاریخ اس کے کامپوننٹ کے رینڈر ہونے سے پہلے استعمال کی گئی۔ MoleculeRouterProvider یا useMoleculeRouter کے ذریعے React Router روٹر کے اندر اسے ماؤنٹ کریں۔',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ایک مثبت محفوظ صحیح عدد ہونا چاہیے',
  'routing.listRoute.error.authRequired':
    'useListRoute: محفوظ کردہ انتخابات کو auth.status اور auth.redirectTo درکار ہیں',
  'routing.listRoute.error.unknownSelection': 'useListRoute: نامعلوم انتخاب "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: نامعلوم فلٹر "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: راستہ فلٹر "{{filter}}" کو param "{{param}}" درکار ہے',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: راستہ فلٹر "{{filter}}" ہٹایا نہیں جا سکتا',
  'routing.listRoute.error.pathPattern':
    'useListRoute: راستہ پیرامیٹرز تبدیل کرنے کے لیے راستہ پیٹرن درکار ہے',
  'routing.listRoute.error.page': 'useListRoute: page ایک مثبت محفوظ صحیح عدد ہونا چاہیے',
  'routing.sveltekit.error.serverHistory':
    'تاریخ کی نقل و حرکت صرف براؤزر میں دستیاب ہے: SvelteKit کلائنٹ روٹر سرور سائیڈ رینڈرنگ کے دوران نہیں چلتا',
}
