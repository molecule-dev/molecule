/**
 * Route pages loaded on demand, each inside a Suspense boundary of its own.
 *
 * @module
 */

import { createComponent, type JSX, lazy, Suspense } from 'solid-js'

/** Any component `lazy` can load. */
export type LazyLoadableComponent = Awaited<ReturnType<Parameters<typeof lazy>[0]>>['default']

/**
 * The props a page component declares.
 *
 * A page may declare its props parameter optional (`function Draft({ initial }: DraftProps = {})`),
 * which Solid's own `ComponentProps` cannot read: its `infer` falls back to the type
 * parameter's constraint. Both forms are read here, with the `undefined` an optional
 * parameter adds removed.
 *
 * @template Page - The page component.
 */
type LazyPageProps<Page> = Page extends (props: infer Props) => JSX.Element
  ? NonNullable<Props>
  : Page extends (props?: infer Props) => JSX.Element
    ? NonNullable<Props>
    : never

/**
 * The component {@link lazyPage} returns for a page: the page's own props, without the
 * `undefined` an optional props parameter adds. Solid's `Component` type refuses this
 * shape when the props are generic, so it is written as the call signature itself.
 *
 * @template Page - The page component.
 */
type LazyPageComponent<Page extends LazyLoadableComponent> = (
  props: LazyPageProps<Page>,
) => JSX.Element

/** Options for {@link lazyPage}. */
export interface LazyPageOptions {
  /**
   * What the page's area shows while its code loads. Defaults to nothing.
   *
   * Give it as a getter (`get fallback() { return <Spinner /> }`) when the fallback
   * builds DOM of its own: a page's boundary can be shown more than once, and a getter
   * makes a fresh element for each showing.
   */
  fallback?: JSX.Element
}

/**
 * Load a route's page on demand, inside a Suspense boundary that belongs to the page.
 *
 * Use it instead of Solid's `lazy` for every page a `<Route>` renders. Navigating to a
 * page whose code has not loaded yet then replaces the previous page at once: the
 * previous page unmounts and the new page's own boundary shows `fallback` until its
 * code arrives. With `lazy` under one shared `<Suspense>` around the routes, Solid
 * Router's navigation transition keeps the previous page mounted (hidden) behind that
 * boundary's fallback, so the URL already names the new page while the old page's
 * content is still in the DOM, and a check such as `getByRole('heading')` finds the old
 * page's headings. Layout routes (an app shell around the router's children) stay
 * mounted either way.
 *
 * @param load - Loads the page module, as for Solid's `lazy`:
 *   `() => import('./pages/Article.js').then((m) => ({ default: m.Article }))`.
 * @param options - Optional `fallback` shown in the page's area while its code loads.
 * @returns A component to use as a route's `component`: `<Route path="/article/:slug" component={Article} />`.
 *   Its props are the page's own, without the `undefined` an optional props parameter
 *   (`function Draft({ initial }: DraftProps = {})`) adds.
 *
 * @example
 * ```tsx
 * import { Route } from '@solidjs/router'
 * import { lazyPage } from '@molecule/app-routing-solid-router'
 *
 * const Home = lazyPage(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
 * const Article = lazyPage(() =>
 *   import('./pages/Article.js').then((m) => ({ default: m.Article })),
 * )
 *
 * <Route path="/" component={Home} />
 * <Route path="/article/:slug" component={Article} />
 * ```
 */
export function lazyPage<Page extends LazyLoadableComponent>(
  load: () => Promise<{ default: Page }>,
  options: LazyPageOptions = {},
): LazyPageComponent<Page> {
  // The module once its code has arrived. A page that mounts after its code loaded
  // renders the component directly inside its boundary instead of going through
  // `lazy`'s resource, whose fresh per-mount resource is pending for one microtask and
  // would show `fallback` for a frame on every visit after the first.
  let loadedPage: Page | undefined
  let loading: Promise<{ default: Page }> | undefined
  const loadOnce = (): Promise<{ default: Page }> => {
    loading ??= load().then((module) => {
      loadedPage = module.default
      return module
    })
    return loading
  }
  const LazyLoaded = lazy(loadOnce)
  /**
   * The page inside its own Suspense boundary.
   *
   * @param props - The page's props, passed through.
   * @returns The page, or `fallback` while its code loads.
   */
  function LazyPage(props: LazyPageProps<Page>): JSX.Element {
    return (
      <Suspense fallback={options.fallback}>
        {loadedPage === undefined ? <LazyLoaded {...props} /> : createComponent(loadedPage, props)}
      </Suspense>
    )
  }
  return LazyPage
}
