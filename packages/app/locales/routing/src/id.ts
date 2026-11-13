import type { RoutingTranslations } from './types.js'

/** Routing translations for Indonesian. */
export const id: RoutingTranslations = {
  'routing.error.missingParam': 'Parameter "{{name}}" tidak ditemukan untuk path "{{pattern}}"',
  'routing.error.routeNotFound': 'Rute "{{name}}" tidak ditemukan',
  'routing.error.noNavigationRef':
    'Referensi navigasi belum diatur. Pastikan `MoleculeProvider` sudah terpasang.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` harus digunakan di dalam router React Router. Pasang `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, atau `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'React Router history digunakan sebelum komponennya dirender. Pasang di dalam router React Router melalui MoleculeRouterProvider atau useMoleculeRouter.',
  'routing.listRoute.error.pageSize':
    'useListRoute: pageSize harus berupa bilangan bulat aman positif',
  'routing.listRoute.error.authRequired':
    'useListRoute: seleksi terlindungi memerlukan auth.status dan auth.redirectTo',
  'routing.listRoute.error.unknownSelection': 'useListRoute: seleksi tidak dikenal "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: filter tidak dikenal "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: filter jalur "{{filter}}" memerlukan param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: filter jalur "{{filter}}" tidak dapat dihapus',
  'routing.listRoute.error.pathPattern':
    'useListRoute: mengubah parameter jalur memerlukan pola jalur',
  'routing.listRoute.error.page': 'useListRoute: page harus berupa bilangan bulat aman positif',
  'routing.sveltekit.error.serverHistory':
    'pergerakan history hanya tersedia di browser: router klien SvelteKit tidak berjalan selama rendering sisi server',
}
