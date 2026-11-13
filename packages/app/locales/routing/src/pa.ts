import type { RoutingTranslations } from './types.js'

/** Routing translations for Punjabi. */
export const pa: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" ਮਾਰਗ ਲਈ "{{pattern}}" ਪੈਰਾਮੀਟਰ ਗੁੰਮ ਹੈ',
  'routing.error.routeNotFound': '"{{name}}" ਰੂਟ ਨਹੀਂ ਮਿਲਿਆ',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter ਨੂੰ MoleculeRouterProvider ਦੇ ਅੰਦਰ ਵਰਤਿਆ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ',
  'routing.error.noNavigationRef':
    'ਨੈਵੀਗੇਸ਼ਨ ਰੈਫ਼ਰ ਸੈੱਟ ਨਹੀਂ ਹੈ। ਯਕੀਨੀ ਬਣਾਓ ਕਿ `MoleculeProvider` ਮਾਊਂਟ ਕੀਤਾ ਗਿਆ ਹੈ।',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` React Router ਰਾਊਟਰ ਦੇ ਅੰਦਰ ਵਰਤਿਆ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ। `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, ਜਾਂ `RouterProvider` ਮਾਊਂਟ ਕਰੋ।',
}
