import type { RoutingTranslations } from './types.js'

/** Routing translations for Telugu. */
export const te: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" మార్గానికి "{{pattern}}" పారామీటర్ లేదు',
  'routing.error.routeNotFound': '"{{name}}" మార్గం కనుగొనబడలేదు',
  'routing.error.noNavigationRef':
    'నావిగేషన్ రిఫరెన్స్ సెట్ చేయబడలేదు. `MoleculeProvider` మౌంట్ చేయబడిందని నిర్ధారించుకోండి.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` తప్పనిసరిగా React Router రౌటర్‌లోపల ఉపయోగించాలి. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, లేదా `RouterProvider` మౌంట్ చేయండి.',
  'routing.error.reactRouterHistoryBeforeRender':
    'దాని భాగం రెండర్ అయ్యే ముందు React Router చరిత్ర ఉపయోగించబడింది. MoleculeRouterProvider లేదా useMoleculeRouter ద్వారా React Router రౌటర్ లోపల దీన్ని మౌంట్ చేయండి.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize ఒక సానుకూల సురక్షిత పూర్ణాంకం కావాలి',
  'routing.listRoute.error.authRequired':
    'useListRoute: రక్షిత ఎంపికలకు auth.status మరియు auth.redirectTo అవసరం',
  'routing.listRoute.error.unknownSelection': 'useListRoute: తెలియని ఎంపిక "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: తెలియని ఫిల్టర్ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: పాథ్ ఫిల్టర్ "{{filter}}" కు param "{{param}}" అవసరం',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: పాథ్ ఫిల్టర్ "{{filter}}" తీసివేయబడదు',
  'routing.listRoute.error.pathPattern':
    'useListRoute: పాథ్ పారామితులను మార్చడానికి పాథ్ ప్యాటర్న్ అవసరం',
  'routing.listRoute.error.page': 'useListRoute: page ఒక సానుకూల సురక్షిత పూర్ణాంకం కావాలి',
  'routing.sveltekit.error.serverHistory':
    'చరిత్ర కదలికలు బ్రౌజర్‌లో మాత్రమే అందుబాటులో ఉంటాయి: SvelteKit క్లయింట్ రౌటర్ సర్వర్-సైడ్ రెండరింగ్ సమయంలో నడవదు',
}
