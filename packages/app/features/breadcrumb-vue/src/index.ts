/**
 * Vue breadcrumb navigation component.
 *
 * Exports `<Breadcrumb>` — a list of crumbs where each but the last is a
 * link. The final crumb renders as plain text with `aria-current="page"`.
 * Pass `onNavigate` to intercept clicks and hand off to a router.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { Breadcrumb } from '@molecule/app-breadcrumb-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const navigate = (to: string): void => {
 *       window.location.assign(to)
 *     }
 *     return () =>
 *       h(Breadcrumb, {
 *         items: [
 *           { label: 'Home', to: '/' },
 *           { label: 'Projects', to: '/projects' },
 *           { label: 'Apollo Redesign' },
 *         ],
 *         onNavigate: navigate,
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * Without `onNavigate`, crumbs render as plain `<a href>` (full page
 * load in SPAs) — pass `onNavigate={(to) => navigate(to)}` to stay
 * client-side; with it, crumbs render as `<button>`s. The last item (or
 * any item without `to`) renders as plain text with `aria-current="page"`.
 * No router dependency is required by the component itself. The separator
 * renders per gap: the `separator` slot wins, then the `separator` prop,
 * then the default `/`.
 *
 * @module
 */

export * from './Breadcrumb.js'
export * from './types.js'
