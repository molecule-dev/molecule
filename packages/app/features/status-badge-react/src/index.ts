/**
 * React status-badge and status-pill components.
 *
 * Both components map a small `StatusKind` union (`success`/`warning`/
 * `error`/`info`/`neutral`) to ClassMap-driven styling so apps can
 * restyle by swapping the ClassMap bond rather than rewriting
 * components.
 *
 * @example
 * ```tsx
 * import { StatusBadge, StatusPill } from '@molecule/app-status-badge-react'
 *
 * // Semantic badge in a table row
 * <StatusBadge kind="success">Open</StatusBadge>
 *
 * // Polished-flagship uppercase pill style
 * <StatusBadge kind="warning" appearance="uppercase-pill">Pending</StatusBadge>
 *
 * // Pill with colored dot indicator
 * <StatusPill kind="error">Overdue</StatusPill>
 * ```
 * @module
 */

export * from './StatusBadge.js'
export * from './StatusPill.js'
