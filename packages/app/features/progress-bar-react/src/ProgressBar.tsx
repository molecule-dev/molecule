import { type JSX, type ReactNode, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link ProgressBar}. */
export interface ProgressBarProps {
  /** Current numeric value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Optional label rendered above the track. */
  label?: ReactNode
  /** Optional value display rendered on the right of the label row. */
  valueLabel?: ReactNode
  /**
   * Element id the track is named by (`aria-labelledby`). Wins over `label`
   * and the default accessible name — `ProgressCard` points it at its title.
   */
  labelledBy?: string
  /** Element id the track is described by (`aria-describedby`). */
  describedBy?: string
  /** Size preset — maps to ClassMap `progressHeight`. */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant — maps to ClassMap `progressColor`. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Labeled progress bar with optional value display.
 *
 * Renders a `[label ... valueLabel]` header row above a track. The track
 * itself uses the wired ClassMap progress tokens — swap the ClassMap bond
 * to restyle without touching this component.
 *
 * The track always carries an accessible name (`aria-progressbar-name`):
 * `labelledBy` when given, else the rendered `label`, else
 * `t('progressBar.label', undefined, { defaultValue: 'Progress' })`.
 * @param props - Component props (see {@link ProgressBarProps}).
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  labelledBy,
  describedBy,
  size = 'md',
  color = 'primary',
  className,
}: ProgressBarProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const nameId = useId()
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  // The rendered label is the track's name unless an explicit labelledBy wins.
  const namedByLabel = labelledBy === undefined && !!label
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      {(label || valueLabel) && (
        <div className={cm.flex({ justify: 'between', align: 'center' })}>
          {label && (
            <span
              id={namedByLabel ? nameId : undefined}
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {label}
            </span>
          )}
          {valueLabel && <span className={cm.textSize('sm')}>{valueLabel}</span>}
        </div>
      )}
      <div
        className={cm.cn(cm.progress(), cm.progressHeight(size))}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-labelledby={labelledBy ?? (namedByLabel ? nameId : undefined)}
        aria-label={
          labelledBy === undefined && !label
            ? t('progressBar.label', undefined, { defaultValue: 'Progress' })
            : undefined
        }
        aria-describedby={describedBy}
      >
        <div
          className={cm.cn(cm.progressBar(), cm.progressColor(color))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
