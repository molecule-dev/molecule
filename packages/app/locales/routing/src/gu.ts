import type { RoutingTranslations } from './types.js'

/** Routing translations for Gujarati. */
export const gu: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" પાથ માટે "{{pattern}}" પેરામીટર ખૂટે છે',
  'routing.error.routeNotFound': '"{{name}}" રૂટ મળ્યું નથી',
  'routing.error.noNavigationRef':
    'નેવિગેશન સંદર્ભ સેટ નથી. ખાતરી કરો કે `MoleculeProvider` માઉન્ટ થયેલ છે.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` ઉપયોગ React Router રાઉટરમાં થવો જોઈએ. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, અથવા `RouterProvider` માઉન્ટ કરો.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router હિસ્ટ્રીનો ઉપયોગ તેના કમ્પોનેન્ટ રેન્ડર થાય તે પહેલાં કરવામાં આવ્યો હતો. MoleculeRouterProvider અથવા useMoleculeRouter દ્વારા React Router રાઉટરની અંદર તેને માઉન્ટ કરો.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ધનાત્મક સુરક્ષિત પૂર્ણાંક હોવો જોઈએ',
  'routing.listRoute.error.authRequired':
    'useListRoute: સુરક્ષિત પસંદગીઓને auth.status અને auth.redirectTo જોઈએ',
  'routing.listRoute.error.unknownSelection': 'useListRoute: અજાણી પસંદગી "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: અજાણ્યો ફિલ્ટર "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: પાથ ફિલ્ટર "{{filter}}" ને param "{{param}}" જોઈએ છે',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: પાથ ફિલ્ટર "{{filter}}" દૂર કરી શકાતો નથી',
  'routing.listRoute.error.pathPattern':
    'useListRoute: પાથ પેરામીટર બદલવા માટે પાથ પેટર્ન જરૂરી છે',
  'routing.listRoute.error.page': 'useListRoute: page ધનાત્મક સુરક્ષિત પૂર્ણાંક હોવો જોઈએ',
  'routing.sveltekit.error.serverHistory':
    'હિસ્ટ્રી મૂવ્સ ફક્ત બ્રાઉઝરમાં ઉપલબ્ધ છે: SvelteKit ક્લાયન્ટ રાઉટર સર્વર-સાઇડ રેન્ડરિંગ દરમિયાન ચાલતું નથી',
}
