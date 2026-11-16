/**
 * Rendering constants shared by the waterfall's parts: the bar palette and the
 * pixel geometry React's implementation uses. Internal to the package — not
 * re-exported from its entry point.
 *
 * @module
 */

import type { SpanStatus } from './types.js'

/** Bar fill color per status. */
export const STATUS_COLOR: Record<SpanStatus, string> = {
  ok: '#22c55e',
  error: '#ef4444',
  pending: '#94a3b8',
}

/** Default bar color when no status is supplied. */
export const DEFAULT_BAR_COLOR = '#3b82f6'

/** Number of tick marks rendered along the time axis. */
export const AXIS_TICK_COUNT = 5

/** Pixels of horizontal indentation per parent depth level. */
export const DEPTH_INDENT_PX = 16

/** Pixel height of each span row (label + bar). */
export const ROW_HEIGHT_PX = 28

/** Pixel height of a rendered span bar. */
export const BAR_HEIGHT_PX = 12

/** Width (in pixels) of the left-hand label column. */
export const LABEL_COLUMN_PX = 240
