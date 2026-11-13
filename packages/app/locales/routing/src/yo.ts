import type { RoutingTranslations } from './types.js'

/** Routing translations for Yoruba. */
export const yo: RoutingTranslations = {
  'routing.error.missingParam': 'Pàrámítà "{{name}}" kò sí fún ọ̀nà "{{pattern}}"',
  'routing.error.routeNotFound': 'Kò rí ipa ọ̀nà "{{name}}"',
  'routing.error.noNavigationRef':
    'A kò ṣètò ìtọ́kasí ìlọsíwájú. Rí i dájú pé `MoleculeProvider` wà lórí ẹ̀rọ náà.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'A gbọ́dọ̀ lo `useMoleculeRouter` nínú rédíò React Router. Gbé `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, tàbí `RouterProvider` sókè.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Ìtàn React Router jẹ́ lílo ṣaájú kí èdà rẹ̀ tó hàn. Gbé sókè nínú rédíò React Router nípasẹ̀ MoleculeRouterProvider tàbí useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: gbọdọ̀ pageSize jẹ́ nọ́mbà odidi tí ó kéré ju òdo lọ tí ó sì ní ààbò',
  'routing.listRoute.error.authRequired':
    'useListRoute: àwọn àyàn tí a fi dáàbò bo ná àpámọ̀ auth.status àti auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: àyàn àìmọ̀ "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: àṣà àìmọ̀ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: àṣà ọ̀nà "{{filter}}" nílò param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: kì í ṣeé yọ àṣà ọ̀nà "{{filter}}" kúrò',
  'routing.listRoute.error.pathPattern': 'useListRoute: yíyí àwọn àpàmọ̀ ọ̀nà ní àdàkọ ọ̀nà',
  'routing.listRoute.error.page':
    'useListRoute: gbọdọ̀ page jẹ́ nọ́mbà odidi tí ó kéré ju òdo lọ tí ó sì ní ààbò',
  'routing.sveltekit.error.serverHistory':
    'àwọn ìgbesẹ̀ ìtàn wà nínú aṣàwákiri nìkan: rédíò oníbárà SvelteKit kì í ṣiṣẹ́ nígbà tí a bá ń fihàn ní ẹ̀gbẹ́ server',
}
