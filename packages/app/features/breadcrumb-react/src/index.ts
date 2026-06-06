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
 * @module
 */

export * from './Breadcrumb.js'
