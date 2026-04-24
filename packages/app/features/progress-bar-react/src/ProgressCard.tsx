import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

import { ProgressBar } from './ProgressBar.js'

interface ProgressCardProps {
  title: ReactNode
  /** Optional supporting description below the title. */
  description?: ReactNode
  /** Optional icon shown in the card header. */
  icon?: ReactNode
  /** Current value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Value display on the right of the header (e.g. "73%"). */
  valueLabel?: ReactNode
  /** ProgressBar color. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string
  /** Additional content rendered below the bar. */
  children?: ReactNode
}

/**
 * `<Card>`-wrapped progress display with title, optional icon and description,
 * the progress bar itself, and an optional extras slot below. Useful for
 * budget/goal cards, storage-used panels, onboarding progress, etc.
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.icon
 * @param root0.value
 * @param root0.max
 * @param root0.valueLabel
 * @param root0.color
 * @param root0.className
 * @param root0.children
 */
export function ProgressCard({
  title,
  description,
  icon,
  value,
  max = 100,
  valueLabel,
  color = 'primary',
  className,
  children,
}: ProgressCardProps) {
  const cm = getClassMap()
  return (
    <Card className={className}>
      <div className={cm.stack(3)}>
        <div className={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <div>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
              {description && <p className={cm.textSize('sm')}>{description}</p>}
            </div>
          </div>
          {valueLabel && (
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {valueLabel}
            </span>
          )}
        </div>
        <ProgressBar value={value} max={max} color={color} />
        {children}
      </div>
    </Card>
  )
}
