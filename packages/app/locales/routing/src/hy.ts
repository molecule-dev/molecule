import type { RoutingTranslations } from './types.js'

/** Routing translations for Armenian. */
export const hy: RoutingTranslations = {
  'routing.error.missingParam': '"{{name}}" delays "{{pattern}}" is missing',
  'routing.error.routeNotFound': '"{{name}}" երթուղին չի գտնվել',
  'routing.error.useMoleculeRouterOutsideProvider':
    'useMoleculeRouter-ը պետք է օգտագործվի MoleculeRouterProvider-ի ներսում',
  'routing.error.noNavigationRef':
    'Նավիգացիայի հղումը սահմանված չէ: Համոզվեք, որ `MoleculeProvider` միացված է:',
  'routing.error.useMoleculeRouterOutsideRouter':
    'React Router ռաութերի ներսում պետք է օգտագործվի `useMoleculeRouter` : Տեղադրեք `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router` կամ `RouterProvider`:',
}
