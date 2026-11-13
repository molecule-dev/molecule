import type { RoutingTranslations } from './types.js'

/** Routing translations for Burmese. */
export const my: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" လမ်းကြောင်းအတွက် "{{pattern}}" ပါရာမီတာ ပျောက်နေသည်',
  'routing.error.routeNotFound': '"{{name}}" လမ်းကြောင်းကို ရှာမတွေ့ပါ',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ကို MoleculeRouterProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'routing.error.noNavigationRef':
    'လမ်းညွှန်ကိုးကားချက်ကို မသတ်မှတ်ရသေးပါ။ `MoleculeProvider` ထည့်သွင်းထားကြောင်း သေချာပါစေ။',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router router အတွင်းတွင် အသုံးပြုရမည်။ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` သို့မဟုတ် `RouterProvider` mount လုပ်ပါ။',
}
