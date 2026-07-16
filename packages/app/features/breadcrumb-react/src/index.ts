/**
 * React breadcrumb navigation component.
 *
 * Exports `<Breadcrumb>` — a list of crumbs where each but the last is a
 * link. The final crumb renders as plain text with `aria-current="page"`.
 * Pass `onNavigate` to intercept clicks and hand off to a router.
 *
 * @example
 * ```tsx
 * import { Breadcrumb } from '@molecule/app-breadcrumb-react'
 * import { useNavigate } from 'react-router-dom'
 *
 * const navigate = useNavigate()
 *
 * <Breadcrumb
 *   items={[
 *     { label: 'Home', to: '/' },
 *     { label: 'Projects', to: '/projects' },
 *     { label: 'Apollo Redesign' },
 *   ]}
 *   onNavigate={(to) => navigate(to)}
 * />
 * ```
 *
 * @remarks
 * Without `onNavigate`, crumbs render as plain `<a href>` (full page
 * load in SPAs) — pass `onNavigate={(to) => navigate(to)}` to stay
 * client-side; with it, crumbs render as `<button>`s. The last item (or
 * any item without `to`) renders as plain text with `aria-current="page"`.
 * No router dependency is required by the component itself.
 *
 * @module
 */

export * from './Breadcrumb.js'
