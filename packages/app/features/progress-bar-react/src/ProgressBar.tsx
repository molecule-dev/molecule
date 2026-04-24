import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ProgressBarProps {
  /** Current numeric value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Optional label rendered above the track. */
  label?: ReactNode
  /** Optional value display rendered on the right of the label row. */
  valueLabel?: ReactNode
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
 * @param root0
 * @param root0.value
 * @param root0.max
 * @param root0.label
 * @param root0.valueLabel
 * @param root0.size
 * @param root0.color
 * @param root0.className
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  size = 'md',
  color = 'primary',
  className,
}: ProgressBarProps) {
  const cm = getClassMap()
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      {(label || valueLabel) && (
        <div className={cm.flex({ justify: 'between', align: 'center' })}>
          {label && (
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</span>
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
      >
        <div
          className={cm.cn(cm.progressBar(), cm.progressColor(color))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
