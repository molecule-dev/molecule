/**
 * React status-badge and status-pill components.
 *
 * Both components map a small `StatusKind` union (`success`/`warning`/
 * `error`/`info`/`neutral`) to ClassMap-driven styling so apps can
 * restyle by swapping the ClassMap bond rather than rewriting
 * components.
 *
 * `<StatusBadge kind children icon? appearance? className?>` — the
 * contract is `kind` + `children` (there are NO `label`/`color` props).
 * `appearance='ui'` (default) wraps `<Badge>` from
 * `@molecule/app-ui-react` and works with any ClassMap bond.
 * `<StatusPill kind children dot? className?>` adds a small colored
 * status dot before the label.
 *
 * @example
 * ```tsx
 * import { StatusBadge, type StatusKind, StatusPill } from '@molecule/app-status-badge-react'
 *
 * export function TicketStatusList() {
 *   const kindByStatus: Record<string, StatusKind> = { open: 'info', resolved: 'success', overdue: 'error' }
 *   const tickets = [
 *     { id: 'T-101', title: 'Login fails on Safari', status: 'open', statusLabel: 'Open' },
 *     { id: 'T-102', title: 'Invoice PDF is blank', status: 'resolved', statusLabel: 'Resolved' },
 *     { id: 'T-103', title: 'Refund not issued', status: 'overdue', statusLabel: 'Overdue' },
 *   ]
 *   return (
 *     <ul>
 *       {tickets.map((ticket) => (
 *         <li key={ticket.id}>
 *           {ticket.title} <StatusBadge kind={kindByStatus[ticket.status]}>{ticket.statusLabel}</StatusBadge>
 *         </li>
 *       ))}
 *       <li>
 *         Support queue <StatusPill kind="success">Online</StatusPill>
 *       </li>
 *     </ul>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `kind` is one of `'success' | 'warning' | 'error' | 'info' | 'neutral'`
 *   (NOT `'danger'`, `'primary'` or an app status string) and defaults to
 *   `'neutral'` — map your own statuses to a `StatusKind` first.
 * - Requires a wired ClassMap bond (`setClassMap(classMap)` from
 *   `@molecule/app-ui`, e.g. with `@molecule/app-ui-tailwind`) —
 *   `getClassMap()` throws before bonding. `<StatusBadge>` also renders
 *   `Badge` from `@molecule/app-ui-react` (a peer dependency).
 * - Both `appearance` variants color through the ClassMap `badge` tokens
 *   (`cm.badge({ variant })` → real `bg-*` / `text-*` theme utilities), so
 *   the `'uppercase-pill'` variant is visibly colored per kind in every
 *   theme — it just adds `cm.uppercase` + `cm.trackingWide` on top of the
 *   same colors the `'ui'` variant uses.
 * - `<StatusPill>` has no background surface of its own — only the dot
 *   is colored; add a surface via `className` if you need a filled pill.
 *   Its `neutral` dot uses `bg-outline`, which also needs a theme
 *   `outline` color token to be visible.
 * - Labels are `children` — pass already-translated strings
 *   (`t('...')`); the components render no text of their own.
 *
 * @module
 */

export * from './StatusBadge.js'
export * from './StatusPill.js'
