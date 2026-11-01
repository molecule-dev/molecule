/**
 * Route pages loaded on demand, each inside a Suspense boundary of its own.
 *
 * @module
 */

import {
  type ComponentProps,
  type ComponentType,
  type JSX,
  lazy,
  type ReactNode,
  Suspense,
} from 'react'

/** Any component `React.lazy` can load. */
export type LazyLoadableComponent = Awaited<ReturnType<Parameters<typeof lazy>[0]>>['default']

/** Options for {@link lazyPage}. */
export interface LazyPageOptions {
  /** What the page's area shows while its code loads. Defaults to nothing. */
  fallback?: ReactNode
}

/**
 * Load a route's page on demand, inside a Suspense boundary that belongs to the page.
 *
 * Use it instead of `React.lazy` for every page a `<Route>` renders. Navigating to a
 * page whose code has not loaded yet then replaces the previous page at once: the
 * previous page unmounts and the new page's own boundary shows `fallback` until its
 * code arrives. With `React.lazy` under one shared `<Suspense>` around `<Routes>`,
 * React keeps the previous page mounted (hidden) behind that boundary's fallback, so
 * the URL already names the new page while the old page's content is still in the
 * DOM, and a check such as `getByRole('heading')` finds the old page's headings.
 * Layout routes (an app shell around `<Outlet />`) stay mounted either way.
 *
 * @param load - Loads the page module, as for `React.lazy`:
 *   `() => import('./pages/Article.js').then((m) => ({ default: m.Article }))`.
 * @param options - Optional `fallback` shown in the page's area while its code loads.
 * @returns A component to use as a route's element: `<Route path="/article/:slug" element={<Article />} />`.
 *   Its props are the page's own, without the `undefined` an optional props parameter
 *   (`function Draft({ initial }: DraftProps = {})`) adds: a component type carrying it is
 *   not a valid JSX element type wherever React's types resolve from a second copy.
 *
 * @example
 * ```tsx
 * import { Route, Routes } from 'react-router'
 * import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
 *
 * const Home = lazyPage(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
 * const Article = lazyPage(() =>
 *   import('./pages/Article.js').then((m) => ({ default: m.Article })),
 * )
 *
 * const app = (
 *   <BrowserRouter>
 *     <Routes>
 *       <Route path="/" element={<Home />} />
 *       <Route path="/article/:slug" element={<Article />} />
 *     </Routes>
 *   </BrowserRouter>
 * )
 * ```
 */
export function lazyPage<Page extends LazyLoadableComponent>(
  load: () => Promise<{ default: Page }>,
  options: LazyPageOptions = {},
): ComponentType<NonNullable<ComponentProps<Page>>> {
  const Loaded = lazy(load)
  const fallback = options.fallback ?? null
  /**
   * The page inside its own Suspense boundary.
   *
   * @param props - The page's props, passed through.
   * @returns The page, or `fallback` while its code loads.
   */
  function LazyPage(props: NonNullable<ComponentProps<Page>>): JSX.Element {
    return (
      <Suspense fallback={fallback}>
        <Loaded {...props} />
      </Suspense>
    )
  }
  return LazyPage
}
