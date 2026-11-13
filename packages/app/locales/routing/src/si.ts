import type { RoutingTranslations } from './types.js'

/** Routing translations for Sinhala. */
export const si: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" මාර්ගය සඳහා "{{pattern}}" පරාමිතිය නැත',
  'routing.error.routeNotFound': '"{{name}}" මාර්ගය හමු නොවීය',
  'routing.error.noNavigationRef':
    'සංචාලන යොමුව සකසා නැත. `MoleculeProvider` සවි කර ඇති බව සහතික කර ගන්න.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router router එකක් තුළ භාවිතා කළ යුතුය. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, හෝ `RouterProvider` සවි කරන්න.',
  'routing.error.reactRouterHistoryBeforeRender':
    'එහි සංරචකය විදහායීමට පෙර React Router ඉතිහාසය භාවිතා කර ඇත. MoleculeRouterProvider හෝ useMoleculeRouter හරහා React Router router එකක් තුළ එය සවි කරන්න.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ධන ආරක්ෂිත නිඛිලයක් විය යුතුය',
  'routing.listRoute.error.authRequired':
    'useListRoute: ආරක්ෂිත තේරීම්වලට auth.status සහ auth.redirectTo අවශ්‍ය වේ',
  'routing.listRoute.error.unknownSelection': 'useListRoute: නොදන්නා තේරීම "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: නොදන්නා පෙරහන "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: මාර්ග පෙරහන "{{filter}}" ට param "{{param}}" අවශ්‍ය වේ',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: මාර්ග පෙරහන "{{filter}}" ඉවත් කළ නොහැක',
  'routing.listRoute.error.pathPattern':
    'useListRoute: මාර්ග පරාමිතීන් වෙනස් කිරීමට මාර්ග රටාවක් අවශ්‍ය වේ',
  'routing.listRoute.error.page': 'useListRoute: page ධන ආරක්ෂිත නිඛිලයක් විය යුතුය',
  'routing.sveltekit.error.serverHistory':
    'ඉතිහාස චලන ලබාගත හැක්කේ බ්‍රව්සරය තුළ පමණි: SvelteKit සේවාදායක router එක සේවාදායක පැත්තේ විදහායීමේදී ක්‍රියා නොකරයි',
}
