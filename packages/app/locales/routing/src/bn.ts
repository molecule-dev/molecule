import type { RoutingTranslations } from './types.js'

/** Routing translations for Bengali. */
export const bn: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" পাথের জন্য "{{pattern}}" প্যারামিটার অনুপস্থিত',
  'routing.error.routeNotFound': '"{{name}}" রুট পাওয়া যায়নি',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter অবশ্যই একটি MoleculeRouterProvider-এর মধ্যে ব্যবহার করতে হবে',
  'routing.error.noNavigationRef':
    'নেভিগেশন রেফারেন্স সেট করা হয়নি। নিশ্চিত করুন `MoleculeProvider` মাউন্ট করা আছে।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` অবশ্যই একটি React Router রাউটারের মধ্যে ব্যবহার করতে হবে। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, অথবা `RouterProvider` মাউন্ট করুন।',
}
