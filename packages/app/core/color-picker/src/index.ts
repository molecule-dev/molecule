/**
 * Color picker core interface for molecule.dev.
 *
 * Provides a standardized API for color selection UI components.
 * Bond a provider (e.g. `@molecule/app-color-picker-default`) to
 * supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-color-picker'
 *
 * const picker = requireProvider().createPicker({
 *   value: '#3498db',
 *   format: 'hex',
 *   showAlpha: true,
 *   onChange: (color) => console.log('Selected:', color),
 * })
 * ```
 */

export * from './provider.js'
export * from './types.js'
