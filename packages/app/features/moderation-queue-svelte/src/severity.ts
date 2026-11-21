/**
 * The severity → `ColorVariant` mapping, exported so the Svelte package
 * exposes the same `severityColor` function as its React counterpart.
 *
 * @module
 */

import type { ColorVariant } from '@molecule/app-ui'

import type { ModerationItemSeverity } from './types.js'

/** The severity → `ColorVariant` mapping. */
const SEVERITY_COLOR: Record<ModerationItemSeverity, ColorVariant> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
}

/**
 * Translates a severity to its `ColorVariant`. Exported for tests and
 * downstream consumers (chips, badges, summary tiles).
 *
 * @param severity - Severity bucket (`'low'`, `'medium'`, `'high'`) or undefined.
 * @returns Mapped `ColorVariant`, defaulting to `'info'` when severity is omitted.
 */
export function severityColor(severity: ModerationItemSeverity | undefined): ColorVariant {
  return severity ? SEVERITY_COLOR[severity] : 'info'
}
