import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** A single step entry in a StatusTimeline. */
export interface StatusTimelineStep {
  /** Stable identifier for this step (used as the React key). */
  key: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

/** Props for the StatusTimeline component. */
export interface StatusTimelineProps {
  /** Ordered list of steps from earliest to latest. */
  steps: ReadonlyArray<StatusTimelineStep>
  /** The key of the current step. Steps with the same or earlier index are shown as "reached". */
  currentKey: string
  /** Aria-label for the timeline ordered list. */
  ariaLabel?: string
  /** Extra classes on the outer `<ol>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Vertical ordered-step status timeline.
 *
 * Each step renders as a colored dot + label. Steps at or before the
 * current one are "reached" (filled dot); the current step's label is
 * bolded; steps after the current one are dimmed via `cm.textMuted`.
 *
 * @param props - Component props (see {@link StatusTimelineProps}).
 */
export function StatusTimeline({
  steps,
  currentKey,
  ariaLabel,
  className,
  dataMolId,
}: StatusTimelineProps): JSX.Element {
  const cm = getClassMap()
  const currentIdx = steps.findIndex((s) => s.key === currentKey)
  return (
    <ol
      className={cm.cn('space-y-2', cm.textSize('sm'), className)}
      aria-label={ariaLabel}
      data-mol-id={dataMolId}
    >
      {steps.map((step, i) => {
        const reached = currentIdx >= 0 && i <= currentIdx
        const isCurrent = i === currentIdx
        return (
          <li key={step.key} className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.roundedFull,
                'h-2 w-2',
                reached ? 'bg-primary' : 'bg-outline-variant',
              )}
              aria-hidden="true"
            />
            <span
              className={cm.cn(
                reached ? '' : cm.textMuted,
                isCurrent ? cm.fontWeight('semibold') : '',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
