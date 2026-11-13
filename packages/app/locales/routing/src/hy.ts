import type { RoutingTranslations } from './types.js'

/** Routing translations for Armenian. */
export const hy: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" delays "{{pattern}}" is missing',
  'routing.error.routeNotFound': '"{{name}}" երթուղին չի գտնվել',
  'routing.error.noNavigationRef':
    'Նավիգացիայի հղումը սահմանված չէ: Համոզվեք, որ `MoleculeProvider` միացված է:',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Router ռաութերի ներսում պետք է օգտագործվի `useMoleculeRouter` : Տեղադրեք `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` կամ `RouterProvider`:',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router պատմությունը օգտագործվել է մինչ դրա կոմպոնենտի արտապատկերումը: Տեղադրեք այն React Router ռաութերի ներսում MoleculeRouterProvider կամ useMoleculeRouter-ի միջոցով:',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize-ը պետք է լինի դրական անվտանգ ամբողջ թիվ',
  'routing.listRoute.error.authRequired':
    'useListRoute: պաշտպանված ընտրությունները պահանջում են auth.status և auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: անհայտ ընտրություն "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: անհայտ ֆիլտր "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ուղու ֆիլտրը "{{filter}}" պահանջում է "{{param}}" պարամետր',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ուղու ֆիլտրը "{{filter}}" հնարավոր չէ հեռացնել',
  'routing.listRoute.error.pathPattern':
    'useListRoute: ուղու պարամետրերի փոփոխությունը պահանջում է ուղու նմուշ',
  'routing.listRoute.error.page': 'useListRoute: page-ը պետք է լինի դրական անվտանգ ամբողջ թիվ',
  'routing.sveltekit.error.serverHistory':
    'պատմության տեղաշարժերը հասանելի են միայն բրաուզերում՝ SvelteKit-ի կլիենտային ռաութերը չի գործարկվում սերվերի կողմի արտապատկերման ժամանակ',
}
