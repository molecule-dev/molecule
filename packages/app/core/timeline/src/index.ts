/**
 * Timeline core interface for molecule.dev.
 *
 * Provides a standardized API for rendering timeline and activity log
 * UI components. Bond a provider (e.g. `@molecule/app-timeline-default`)
 * to supply the concrete implementation.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-timeline'
 * import { provider } from '@molecule/app-timeline-default'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const timeline = requireProvider().createTimeline({
 *   items: [{ id: '1', date: new Date(), title: 'Created project' }],
 *   orientation: 'vertical',
 * })
 * timeline.addItem({ id: '2', date: new Date(), title: 'Invited teammate' })
 * ```
 *
 * @remarks
 * - **The instance is HEADLESS state, not UI.** `createTimeline` returns item
 *   management (`setItems`/`addItem`/`removeItem`/`getItems`) — nothing appears
 *   on screen. The app renders the entries itself, styling via `getClassMap()`
 *   from `@molecule/app-ui` and putting every label through
 *   `t('key', values, { defaultValue })`.
 * - **Wire the bond at startup** — {@link requireProvider} throws until
 *   `setProvider` has been called.
 * - `TimelineItem.date` is a `Date` — format it for display with the app's
 *   locale-aware formatting, never a hardcoded locale string.
 * - Call `destroy()` when the owning screen unmounts.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
