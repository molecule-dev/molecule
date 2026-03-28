/**
 * Date range picker core interface for molecule.dev.
 *
 * Provides a standardized API for date range selection UI components.
 * Bond a provider (e.g. `@molecule/app-date-range-picker-default`) to
 * supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-date-range-picker'
 *
 * const picker = requireProvider().createPicker({
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   onChange: (range) => console.log(range),
 * })
 * ```
 */

export * from './provider.js'
export * from './types.js'
