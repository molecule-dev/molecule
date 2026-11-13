/**
 * Solid Router provider for `@molecule/app-routing`.
 *
 * Implements the molecule `Router` over `@solidjs/router`, so molecule packages
 * navigate the app's real Solid Router. Build it from a component under the router and
 * hand it to `MoleculeProvider`, so every molecule package shares it:
 *
 * @example
 * ```tsx
 * import { MemoryRouter, Route } from '@solidjs/router'
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { createSolidRouter } from '@molecule/app-routing-solid-router'
 *
 * <MemoryRouter history={memory} root={(props) => (
 *   <MoleculeProvider config={{ router: createSolidRouter({ history: memory }) }}>
 *     {props.children}
 *   </MoleculeProvider>
 * )}>
 *   <Route path="/users/:id" component={User} />
 *   <Route path="*rest" component={NotFound} />
 * </MemoryRouter>
 * ```
 *
 * @remarks
 * - Call `createSolidRouter()` inside the router's `root` component (any component under
 *   `<Router>`, `<HashRouter>` or `<MemoryRouter>`): it reads the native router through
 *   `useLocation()`, `useNavigate()` and `useParams()`, which need that context.
 * - Do NOT wire the exported `provider` const in a Solid app: it is the core's plain
 *   browser router for use where no Solid Router is mounted.
 *
 * @module @molecule/app-routing-solid-router
 */

export * from './memory-history.js'
export * from './provider.js'
export * from './types.js'
