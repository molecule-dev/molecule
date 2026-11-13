import type { RoutingTranslations } from './types.js'

/** Routing translations for Yoruba. */
export const yo: RoutingTranslations = {
  'routing.error.missingParam': 'Pàrámítà "{{name}}" kò sí fún ọ̀nà "{{pattern}}"',
  'routing.error.routeNotFound': 'Kò rí ipa ọ̀nà "{{name}}"',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter gbọdọ̀ jẹ́ lílò nínú MoleculeRouterProvider',
  'routing.error.noNavigationRef':
    'A kò ṣètò ìtọ́kasí ìlọsíwájú. Rí i dájú pé `MoleculeProvider` wà lórí ẹ̀rọ náà.',
  'routing.error.useMoleculeRouterOutsideRouter':
    'A gbọ́dọ̀ lo `useMoleculeRouter` nínú rédíò React Router. Gbé `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, tàbí `RouterProvider` sókè.',
}
