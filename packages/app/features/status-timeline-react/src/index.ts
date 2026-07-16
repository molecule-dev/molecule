/**
 * Vertical ordered-step status timeline.
 *
 * Exports `<StatusTimeline>` — render a list of steps with colored dots
 * indicating reached state and bolded label on the current step. Generic
 * for orders, workflows, kanban progressions, etc.
 *
 * @example
 * ```tsx
 * import { StatusTimeline } from '@molecule/app-status-timeline-react'
 *
 * <StatusTimeline
 *   steps={[
 *     { key: 'placed', label: 'Order Placed' },
 *     { key: 'processing', label: 'Processing' },
 *     { key: 'shipped', label: 'Shipped' },
 *     { key: 'delivered', label: 'Delivered' },
 *   ]}
 *   currentKey="shipped"
 *   ariaLabel="Order status"
 * />
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). No i18n dependency — pass pre-translated `label` strings
 *   and a translated `ariaLabel`.
 * - If `currentKey` matches no step, EVERY step renders as unreached —
 *   there is no error; double-check the key values.
 * - Reached dots use `bg-primary` (works with the scaffold theme);
 *   unreached dots use `bg-outline-variant` and row spacing uses
 *   `space-y-2` — both are Material-3/raw utilities that the minimal
 *   scaffold theme does not generate, so unreached dots can be invisible
 *   and rows unspaced outside flagship-derived themes.
 * - Vertical list only; for a horizontal stage rail use
 *   `@molecule/app-stage-timeline-react`.
 *
 * @module
 */

export * from './StatusTimeline.js'
