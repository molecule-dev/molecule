/**
 * Standalone trend delta chip (▲ 12%).
 *
 * Exports `<TrendChip>`.
 *
 * @example
 * ```tsx
 * import { TrendChip } from '@molecule/app-trend-chip-react'
 *
 * // Subtle inline (default)
 * <TrendChip delta={12} />
 *
 * // Colored pill, negative delta
 * <TrendChip delta={-4.5} suffix="%" variant="pill" />
 * ```
 * @module
 */

export * from './TrendChip.js'
