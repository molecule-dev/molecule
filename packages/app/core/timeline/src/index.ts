/**
 * Timeline core interface for molecule.dev.
 *
 * Provides a standardized API for rendering timeline and activity log
 * UI components. Bond a provider (e.g. `@molecule/app-timeline-default`)
 * to supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-timeline'
 *
 * const timeline = requireProvider().createTimeline({
 *   items: [{ id: '1', date: new Date(), title: 'Created project' }],
 *   orientation: 'vertical',
 * })
 * ```
 */

export * from './provider.js'
export * from './types.js'
