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
 * import { StatusBadge, StatusPill } from '@molecule/app-status-badge-react'
 *
 * <StatusBadge kind="success">Open</StatusBadge>
 *
 * <StatusBadge kind="warning" icon={<span aria-hidden>!</span>}>Pending</StatusBadge>
 *
 * <StatusPill kind="error">Overdue</StatusPill>
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
 *   `getClassMap()` throws before bonding.
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
