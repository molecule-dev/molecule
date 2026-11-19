/**
 * Route pages loaded on demand, each showing its own fallback while its code loads.
 *
 * @module
 */

import {
  type Component,
  defineAsyncComponent,
  defineComponent,
  type DefineSetupFnComponent,
  h,
  type PublicProps,
  type VNode,
} from 'vue'

/** Any component a lazy page can load. */
export type LazyLoadableComponent = Component

/** Options for {@link lazyPage}. */
export interface LazyPageOptions {
  /** What the page's area shows while its code loads. Defaults to nothing. */
  fallback?: Component
}

/**
 * The props a component declares, as `h()` reads them.
 *
 * Vue has no `ComponentProps` helper: an options component keeps them on its public
 * instance's `$props` (with Vue's own vnode props mixed in), and a functional component
 * takes them as its first parameter.
 */
type ComponentProps<C> = C extends (props: infer P, ...args: never[]) => unknown
  ? P
  : C extends new (...args: never[]) => { $props: infer P }
    ? Omit<P, keyof PublicProps>
    : Record<string, never>

/**
 * Load a route's page on demand, each page inside a fallback of its own.
 *
 * Use it instead of `defineAsyncComponent` for every page a route names. Navigating to a
 * page whose code has not loaded yet then replaces the previous page at once: the
 * previous page unmounts and the new page shows `fallback` until its code arrives. A page
 * loaded through `defineAsyncComponent` (suspensible by default) instead suspends into the
 * nearest `<Suspense>`: when the boundary's own content is the page, it keeps the
 * previous page's content mounted while the new one is pending, so the URL already names
 * the new page while the old page is still there. Layout routes (an app shell around
 * `<RouterView>`) stay mounted either way.
 *
 * The page's code is loaded with `suspensible: false` and `delay: 0`, so the fallback is
 * what renders while the code is on its way instead of an empty page that waits for the
 * shared boundary. Do not give the async component to a route record directly: Vue
 * Router warns (`VUE_ROUTER_R0029`) and handles loading itself; this returns the plain
 * wrapper component a route record should name.
 *
 * @param load - Loads the page module, as for `defineAsyncComponent`:
 *   `() => import('./pages/Article.js').then((m) => ({ default: m.Article }))`.
 * @param options - Optional `fallback` shown in the page's area while its code loads.
 * @returns A component to use as a route record's `component`:
 *   `{ path: '/article/:slug', component: lazyPage(load, { fallback }) }`.
 *
 * @example
 * ```ts
 * import { createRouter, createWebHistory } from 'vue-router'
 * import { lazyPage } from '@molecule/app-routing-vue-router'
 *
 * const Home = lazyPage(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
 * const Article = lazyPage(
 *   () => import('./pages/Article.js').then((m) => ({ default: m.Article })),
 *   { fallback: Loading },
 * )
 *
 * const router = createRouter({
 *   history: createWebHistory(),
 *   routes: [
 *     { path: '/', component: Home },
 *     { path: '/article/:slug', component: Article },
 *   ],
 * })
 * ```
 */
export function lazyPage<Page extends LazyLoadableComponent>(
  load: () => Promise<{ default: Page }>,
  options: LazyPageOptions = {},
): DefineSetupFnComponent<ComponentProps<Page>> {
  const Loaded = defineAsyncComponent<Component>({
    // React's contract: `load` resolves to a module and the page is its `default`.
    loader: () => load().then((module) => module.default),
    suspensible: false,
    delay: 0,
    ...(options.fallback ? { loadingComponent: options.fallback } : {}),
  })
  const LazyPage = defineComponent<ComponentProps<Page>>(
    /**
     * The page, without a props declaration of its own: every prop the route hands the
     * wrapper reaches the loaded page as an attribute, which the page's own declaration
     * turns into its props.
     *
     * @param _props - Empty: this wrapper declares no props.
     * @param ctx - The render context carrying the page's props as attributes.
     * @returns The loaded page, or `fallback` while its code loads.
     */
    (_props, { attrs }): (() => VNode) => {
      return (): VNode => h(Loaded, attrs)
    },
    { name: 'LazyPage', inheritAttrs: false },
  )
  // An options component, not a bare function: Vue Router reads a function route record
  // as a lazy import loader (VUE_ROUTER_R0030).
  return LazyPage
}
