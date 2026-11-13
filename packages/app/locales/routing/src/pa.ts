import type { RoutingTranslations } from './types.js'

/** Routing translations for Punjabi. */
export const pa: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" ਮਾਰਗ ਲਈ "{{pattern}}" ਪੈਰਾਮੀਟਰ ਗੁੰਮ ਹੈ',
  'routing.error.routeNotFound': '"{{name}}" ਰੂਟ ਨਹੀਂ ਮਿਲਿਆ',
  'routing.error.noNavigationRef':
    'ਨੈਵੀਗੇਸ਼ਨ ਰੈਫ਼ਰ ਸੈੱਟ ਨਹੀਂ ਹੈ। ਯਕੀਨੀ ਬਣਾਓ ਕਿ `MoleculeProvider` ਮਾਊਂਟ ਕੀਤਾ ਗਿਆ ਹੈ।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router ਰਾਊਟਰ ਦੇ ਅੰਦਰ ਵਰਤਿਆ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ਜਾਂ `RouterProvider` ਮਾਊਂਟ ਕਰੋ।',
  'routing.error.reactRouterHistoryBeforeRender':
    'ਇਸਦੇ ਕੰਪੋਨੈਂਟ ਰੈਂਡਰ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ React Router ਹਿਸਟਰੀ ਦੀ ਵਰਤੋਂ ਕੀਤੀ ਗਈ। MoleculeRouterProvider ਜਾਂ useMoleculeRouter ਰਾਹੀਂ React Router ਰਾਊਟਰ ਦੇ ਅੰਦਰ ਇਸਨੂੰ ਮਾਊਂਟ ਕਰੋ।',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize ਸਕਾਰਾਤਮਕ ਸੁਰੱਖਿਅਤ ਪੂਰਨ ਅੰਕ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ',
  'routing.listRoute.error.authRequired':
    'useListRoute: ਸੁਰੱਖਿਅਤ ਚੋਣਾਂ ਲਈ auth.status ਅਤੇ auth.redirectTo ਲੋੜੀਂਦੇ ਹਨ',
  'routing.listRoute.error.unknownSelection': 'useListRoute: ਅਣਜਾਣ ਚੋਣ "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: ਅਣਜਾਣ ਫਿਲਟਰ "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: ਪਾਥ ਫਿਲਟਰ "{{filter}}" ਨੂੰ param "{{param}}" ਦੀ ਲੋੜ ਹੈ',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: ਪਾਥ ਫਿਲਟਰ "{{filter}}" ਹਟਾਇਆ ਨਹੀਂ ਜਾ ਸਕਦਾ',
  'routing.listRoute.error.pathPattern': 'useListRoute: ਪਾਥ ਪੈਰਾਮੀਟਰ ਬਦਲਣ ਲਈ ਪਾਥ ਪੈਟਰਨ ਲੋੜੀਂਦਾ ਹੈ',
  'routing.listRoute.error.page': 'useListRoute: page ਸਕਾਰਾਤਮਕ ਸੁਰੱਖਿਅਤ ਪੂਰਨ ਅੰਕ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ',
  'routing.sveltekit.error.serverHistory':
    'ਹਿਸਟਰੀ ਮੂਵਜ਼ ਸਿਰਫ਼ ਬਰਾਊਜ਼ਰ ਵਿੱਚ ਉਪਲਬਧ ਹਨ: SvelteKit ਕਲਾਇੰਟ ਰਾਊਟਰ ਸਰਵਰ-ਸਾਈਡ ਰੈਂਡਰਿੰਗ ਦੌਰਾਨ ਨਹੀਂ ਚੱਲਦਾ',
}
