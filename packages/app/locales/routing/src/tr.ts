import type { RoutingTranslations } from './types.js'

/** Routing translations for Turkish. */
export const tr: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" yolu için "{{pattern}}" parametresi eksik',
  'routing.error.routeNotFound': '"{{name}}" rotası bulunamadı',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter bir MoleculeRouterProvider içinde kullanılmalıdır',
  'routing.error.noNavigationRef':
    'Navigasyon referansı ayarlanmadı. `MoleculeProvider` bağlı olduğundan emin olun.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` bir React Router yönlendiricisi içinde kullanılmalıdır. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` veya `RouterProvider` bağlayın.',
}
