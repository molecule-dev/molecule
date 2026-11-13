import type { RoutingTranslations } from './types.js'

/** Routing translations for Telugu. */
export const te: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" మార్గానికి "{{pattern}}" పారామీటర్ లేదు',
  'routing.error.routeNotFound': '"{{name}}" మార్గం కనుగొనబడలేదు',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ను MoleculeRouterProvider లోపల ఉపయోగించాలి',
  'routing.error.noNavigationRef':
    'నావిగేషన్ రిఫరెన్స్ సెట్ చేయబడలేదు. `MoleculeProvider` మౌంట్ చేయబడిందని నిర్ధారించుకోండి.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` తప్పనిసరిగా React Router రౌటర్‌లోపల ఉపయోగించాలి. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, లేదా `RouterProvider` మౌంట్ చేయండి.',
}
