import type { RoutingTranslations } from './types.js'

/** Routing translations for Urdu. */
export const ur: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" راستے کے لیے "{{pattern}}" پیرامیٹر موجود نہیں',
  'routing.error.routeNotFound': '"{{name}}" راستہ نہیں ملا',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter کو MoleculeRouterProvider کے اندر استعمال کیا جانا چاہیے',
  'routing.error.noNavigationRef':
    'نیویگیشن ریفری سیٹ نہیں ہے۔ یقینی بنائیں کہ `MoleculeProvider` نصب ہے۔',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Router روٹر کے اندر `useMoleculeRouter` استعمال کرنا ضروری ہے۔ ماؤنٹ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, یا `RouterProvider` ۔',
}
