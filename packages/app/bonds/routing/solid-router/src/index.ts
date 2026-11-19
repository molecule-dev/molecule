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
 * - **A route with parameters? Declare its page with `defineRoute`.** The route path is the
 *   source of truth for the page's parameter names: `:name`, `:name?` and `*rest` each arrive
 *   as `string | undefined`. For example:
 *
 *   ```tsx
 *   import { defineRoute } from '@molecule/app-routing-solid-router'
 *
 *   const shelves = [
 *     defineRoute('/shelves/:shelf', ({ shelf }) => <Shelf name={shelf} view="all" />),
 *     defineRoute('/shelves/:shelf/saved', ({ shelf }) => <Shelf name={shelf} view="saved" />),
 *   ]
 *   ```
 *
 *   Keep the returned route when links or a save handler need its destination. For
 *   `const detail = defineRoute('/shelves/:shelf', { Component: ShelfDetail })`, use
 *   `detail.href({ shelf: saved.slug })` to navigate to the saved record.
 *
 * @module @molecule/app-routing-solid-router
 */

export * from './define-route.js'
export * from './hooks.jsx'
export * from './lazy-page.jsx'
export * from './list-types.js'
export * from './ListRouteNav.jsx'
export * from './memory-history.js'
export * from './memory-router.jsx'
export * from './provider.js'
export * from './provider-component.jsx'
export * from './types.js'
export * from './use-consumed-search-param.js'
export * from './use-list-route.js'
export * from './utilities.js'
