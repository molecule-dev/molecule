import type { RoutingTranslations } from './types.js'

/** Routing translations for Turkish. */
export const tr: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" yolu için "{{pattern}}" parametresi eksik',
  'routing.error.routeNotFound': '"{{name}}" rotası bulunamadı',
  'routing.error.noNavigationRef':
    'Navigasyon referansı ayarlanmadı. `MoleculeProvider` bağlı olduğundan emin olun.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` bir React Router yönlendiricisi içinde kullanılmalıdır. `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` veya `RouterProvider` bağlayın.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router geçmişi, bileşeni işlenmeden önce kullanıldı. MoleculeRouterProvider veya useMoleculeRouter aracılığıyla bir React Router yönlendiricisi içinde bağlayın.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize pozitif bir güvenli tam sayı olmalıdır',
  'routing.listRoute.error.authRequired':
    'useListRoute: korunan seçimler auth.status ve auth.redirectTo gerektirir',
  'routing.listRoute.error.unknownSelection': 'useListRoute: bilinmeyen seçim "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: bilinmeyen filtre "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: yol filtresi "{{filter}}" param "{{param}}" gerektirir',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: yol filtresi "{{filter}}" kaldırılamaz',
  'routing.listRoute.error.pathPattern':
    'useListRoute: yol parametrelerini değiştirmek bir yol deseni gerektirir',
  'routing.listRoute.error.page': 'useListRoute: page pozitif bir güvenli tam sayı olmalıdır',
  'routing.sveltekit.error.serverHistory':
    'geçmiş hareketleri yalnızca tarayıcıda kullanılabilir: SvelteKit istemci yönlendiricisi sunucu tarafında işleme sırasında çalışmaz',
  'routing.angularRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` yönlendiriciyi sağlayan bir Angular uygulamasının enjeksiyon bağlamında çağrılmalıdır. Uygulamanın sağlayıcılarına `provideRouter(routes)` ekleyin.',
  'routing.vueRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter`, Vue Router kurulu bir Vue uygulamasının bileşeninin `setup` işlevi içinde çağrılmalıdır. `app.use(router)` ile kurun.',
  'routing.solidRouter.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` bir Solid Router yönlendiricisi içinde kullanılmalıdır. `Router`, `HashRouter` veya `MemoryRouter` bağlayın.',
  'routing.sveltekit.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` bir `MoleculeRouterProvider` içinde kullanılmalıdır. `MoleculeRouterProvider` bileşenini kök düzeninizde sayfanın etrafına bağlayın.',
}
