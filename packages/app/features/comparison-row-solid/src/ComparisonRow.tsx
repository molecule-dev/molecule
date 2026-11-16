/**
 * Solid period-over-period stat comparison row — current value, optional
 * previous value, and a coloured delta% chip.
 *
 * Solid counterpart of `@molecule/app-comparison-row-react`'s `ComparisonRow` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ComparisonRowProps } from './types.js'

const ARROW = (n: number): string => (n > 0 ? '▲' : n < 0 ? '▼' : '–')

/**
 * The semantic tone colouring the delta: the theme's success green for a
 * rise, its error red for a fall, its secondary grey for no change.
 */
const TONE = (n: number): ColorVariant => (n > 0 ? 'success' : n < 0 ? 'error' : 'secondary')

/**
 * Period-over-period stat comparison row — current value, optional previous
 * value, and a coloured delta% chip. Used in dashboards, report summaries,
 * finance overviews.
 *
 * @param props - Component props (see {@link ComparisonRowProps}).
 * @returns The rendered comparison row.
 */
export const ComparisonRow: Component<ComparisonRowProps> = (props) => {
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 'md' }), props.className)}
    >
      <div class={cm.stack(0)}>
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.label}</span>
        {props.periodLabel && <span class={cm.textSize('xs')}>{props.periodLabel}</span>}
      </div>
      <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
        <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{props.current}</span>
        {props.previous !== undefined && (
          <span
            class={cm.cn(cm.textSize('xs'))}
            style={{ 'text-decoration': 'line-through', opacity: 0.6 }}
          >
            {props.previous}
          </span>
        )}
        {props.deltaPct !== undefined && (
          <span
            class={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textTone(TONE(props.deltaPct)),
            )}
          >
            {props.formatDelta ? (
              props.formatDelta(props.deltaPct)
            ) : (
              <>
                {ARROW(props.deltaPct)} {Math.abs(props.deltaPct).toFixed(1)}%
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
