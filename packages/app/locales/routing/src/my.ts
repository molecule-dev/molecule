import type { RoutingTranslations } from './types.js'

/** Routing translations for Burmese. */
export const my: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" လမ်းကြောင်းအတွက် "{{pattern}}" ပါရာမီတာ ပျောက်နေသည်',
  'routing.error.routeNotFound': '"{{name}}" လမ်းကြောင်းကို ရှာမတွေ့ပါ',
  'routing.error.noNavigationRef':
    'လမ်းညွှန်ကိုးကားချက်ကို မသတ်မှတ်ရသေးပါ။ `MoleculeProvider` ထည့်သွင်းထားကြောင်း သေချာပါစေ။',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router router အတွင်းတွင် အသုံးပြုရမည်။ `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` သို့မဟုတ် `RouterProvider` mount လုပ်ပါ။',
  'routing.error.reactRouterHistoryBeforeRender':
    '၎င်း၏ component မရေးဆွဲမီ React Router history ကို အသုံးပြုခဲ့သည်။ MoleculeRouterProvider သို့မဟုတ် useMoleculeRouter မှတဆင့် React Router router အတွင်းတွင် mount လုပ်ပါ။',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize သည် အပြုသဘောဆောင်သော လုံခြုံသော ကိန်းပြည့် ဖြစ်ရမည်',
  'routing.listRoute.error.authRequired':
    'useListRoute: ကာကွယ်ထားသော ရွေးချယ်မှုများတွင် auth.status နှင့် auth.redirectTo လိုအပ်သည်',
  'routing.listRoute.error.unknownSelection': 'useListRoute: မသိရှိသော ရွေးချယ်မှု "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: မသိရှိသော စစ်ထုတ်မှု "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: path စစ်ထုတ်မှု "{{filter}}" တွင် param "{{param}}" လိုအပ်သည်',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: path စစ်ထုတ်မှု "{{filter}}" ကို ဖယ်ရှား၍ မရပါ',
  'routing.listRoute.error.pathPattern':
    'useListRoute: path parameter များ ပြောင်းလဲရန် path pattern လိုအပ်သည်',
  'routing.listRoute.error.page':
    'useListRoute: page သည် အပြုသဘောဆောင်သော လုံခြုံသော ကိန်းပြည့် ဖြစ်ရမည်',
  'routing.sveltekit.error.serverHistory':
    'history ရွေ့လျားမှုများကို browser တွင်သာ ရရှိနိုင်သည်- SvelteKit client router သည် server-side rendering အတွင်း မလည်ပတ်ပါ',
}
