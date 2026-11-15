/**
 * Svelte breadcrumb navigation component.
 *
 * Exports `Breadcrumb` — the Svelte counterpart of
 * `@molecule/app-breadcrumb-react` with the same props and the same DOM:
 * a list of crumbs where each but the last is a link. The final crumb
 * renders as plain text with `aria-current="page"`. Pass `onNavigate` to
 * intercept clicks and hand off to a router.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { Breadcrumb } from '@molecule/app-breadcrumb-svelte'
 *
 *   const items = [
 *     { label: 'Home', to: '/' },
 *     { label: 'Projects', to: '/projects' },
 *     { label: 'Apollo Redesign' },
 *   ]
 * </script>
 *
 * <Breadcrumb {items} onNavigate={(to) => goto(to)} />
 * ```
 *
 * @remarks
 * Without `onNavigate`, crumbs render as plain `<a href>` (full page
 * load in SPAs) — pass `onNavigate={(to) => goto(to)}` to stay
 * client-side; with it, crumbs render as `<button>`s. The last item (or
 * any item without `to`) renders as plain text with `aria-current="page"`.
 * No router dependency is required by the component itself. Node-valued
 * fields (`label`, `icon`, `separator`) are snippets or strings; the
 * separator defaults to a `/`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
