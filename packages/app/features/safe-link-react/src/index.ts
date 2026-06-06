/**
 * `@molecule/app-safe-link-react` — react-router `<Link>` wrapper that
 * appends `#top` when target matches current path. Avoids dead-link
 * probes that return no URL/DOM mutation on same-path clicks.
 *
 * @example
 * ```tsx
 * import { SafeLink } from '@molecule/app-safe-link-react'
 *
 * <SafeLink to="/dashboard" className="nav-link">
 *   Dashboard
 * </SafeLink>
 * ```
 *
 * @module
 */

export * from './SafeLink.js'
