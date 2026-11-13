import type { RoutingTranslations } from './types.js'

/** Routing translations for Malay. */
export const ms: RoutingTranslations = {
  'routing.error.missingParam': 'Parameter "{{name}}" tiada untuk laluan "{{pattern}}"',
  'routing.error.routeNotFound': 'Laluan "{{name}}" tidak dijumpai',
  'routing.error.noNavigationRef':
    'Rujukan navigasi tidak ditetapkan. Pastikan `MoleculeProvider` dipasang.',
  'routing.error.useMoleculeRouterOutsideRouter':
    '`useMoleculeRouter` mesti digunakan dalam penghala React Router. Pasang `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` atau `RouterProvider`.',
  'routing.error.reactRouterHistoryBeforeRender':
    'Sejarah React Router digunakan sebelum komponennya dirender. Pasangnya di dalam penghala React Router melalui MoleculeRouterProvider atau useMoleculeRouter.',
  'routing.listRoute.error.pageSize': 'useListRoute: pageSize mesti berupa integer selamat positif',
  'routing.listRoute.error.authRequired':
    'useListRoute: pilihan terlindung memerlukan auth.status dan auth.redirectTo',
  'routing.listRoute.error.unknownSelection':
    'useListRoute: pilihan tidak dikenali "{{selection}}"',
  'routing.listRoute.error.unknownFilter': 'useListRoute: penapis tidak dikenali "{{filter}}"',
  'routing.listRoute.error.pathFilterParam':
    'useListRoute: penapis laluan "{{filter}}" memerlukan param "{{param}}"',
  'routing.listRoute.error.pathFilterRemoved':
    'useListRoute: penapis laluan "{{filter}}" tidak boleh dibuang',
  'routing.listRoute.error.pathPattern':
    'useListRoute: mengubah parameter laluan memerlukan corak laluan',
  'routing.listRoute.error.page': 'useListRoute: page mesti berupa integer selamat positif',
  'routing.sveltekit.error.serverHistory':
    'pergerakan sejarah hanya tersedia dalam pelayar: penghala pelanggan SvelteKit tidak berjalan semasa pemaparan sisi pelayan',
}
