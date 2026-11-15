/**
 * Solid breadcrumb navigation component.
 *
 * Exports `Breadcrumb` — the Solid counterpart of
 * `@molecule/app-breadcrumb-react` with the same props and the same DOM:
 * a list of crumbs where each but the last is a link. The final crumb
 * renders as plain text with `aria-current="page"`. Pass `onNavigate` to
 * intercept clicks and hand off to a router.
 *
 * @example
 * ```tsx
 * import { Breadcrumb } from '@molecule/app-breadcrumb-solid'
 *
 * export function Trail() {
 *   return (
 *     <Breadcrumb
 *       items={[
 *         { label: 'Home', to: '/' },
 *         { label: 'Projects', to: '/projects' },
 *         { label: 'Apollo Redesign' },
 *       ]}
 *       onNavigate={(to) => navigate(to)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Without `onNavigate`, crumbs render as plain `<a href>` (full page
 * load in SPAs) — pass `onNavigate={(to) => navigate(to)}` to stay
 * client-side; with it, crumbs render as `<button>`s. The last item (or
 * any item without `to`) renders as plain text with `aria-current="page"`.
 * No router dependency is required by the component itself. The separator
 * renders per gap (the default `/`, or the `separator` node cloned per
 * gap — a DOM node can only live in one place).
 *
 * @module
 */

export * from './Breadcrumb.jsx'
export * from './types.js'
