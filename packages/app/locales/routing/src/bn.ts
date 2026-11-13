import type { RoutingTranslations } from './types.js'

/** Routing translations for Bengali. */
export const bn: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" পাথের জন্য "{{pattern}}" প্যারামিটার অনুপস্থিত',
  'routing.error.routeNotFound': '"{{name}}" রুট পাওয়া যায়নি',
  'routing.error.noNavigationRef':
    'নেভিগেশন রেফারেন্স সেট করা হয়নি। নিশ্চিত করুন `MoleculeProvider` মাউন্ট করা আছে।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` অবশ্যই একটি React Router রাউটারের মধ্যে ব্যবহার করতে হবে। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, অথবা `RouterProvider` মাউন্ট করুন।',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router হিস্টোরি তার কম্পোনেন্ট রেন্ডার হওয়ার আগে ব্যবহার করা হয়েছে। MoleculeRouterProvider বা useMoleculeRouter-এর মাধ্যমে একটি React Router রাউটারের মধ্যে এটি মাউন্ট করুন।',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize অবশ্যই একটি ধনাত্মক নিরাপদ পূর্ণসংখ্যা হতে হবে',
  'routing.listRoute.error.authRequired':
    'useListRoute: সুরক্ষিত নির্বাচনের জন্য auth.status এবং auth.redirectTo প্রয়োজন',
  'routing.listRoute.error.unknownSelection': 'useListRoute: অজানা নির্বাচন "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: অজানা ফিল্টার "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: পাথ ফিল্টার "{{filter}}" এর জন্য param "{{param}}" প্রয়োজন',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: পাথ ফিল্টার "{{filter}}" সরানো যাবে না',
  'routing.listRoute.error.pathPattern':
    'useListRoute: পাথ প্যারামিটার পরিবর্তন করতে একটি পাথ প্যাটার্ন প্রয়োজন',
  'routing.listRoute.error.page':
    'useListRoute: page অবশ্যই একটি ধনাত্মক নিরাপদ পূর্ণসংখ্যা হতে হবে',
  'routing.sveltekit.error.serverHistory':
    'হিস্টোরি মুভগুলো শুধুমাত্র ব্রাউজারে পাওয়া যায়: SvelteKit ক্লায়েন্ট রাউটার সার্ভার-সাইড রেন্ডারিংয়ের সময় চলে না',
}
