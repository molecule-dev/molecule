import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Checkbox } from '@molecule/app-ui-react'

/**
 *
 */
export interface ChecklistItem {
  id: string
  label: ReactNode
  /** Optional description / hint shown under the label. */
  description?: ReactNode
  /** Completion state. */
  completed: boolean
  /** When true, the item is rendered disabled and uncheckable. */
  disabled?: boolean
}

interface ChecklistProps {
  items: ChecklistItem[]
  /** Called when an item is toggled. */
  onToggle: (id: string, next: boolean) => void
  /** Show overall progress bar above the list. Defaults to true. */
  showProgress?: boolean
  /** Optional title above the checklist. */
  title?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Onboarding-style checklist with checkboxes, optional descriptions,
 * and an overall progress bar derived from `items`.
 * @param root0
 * @param root0.items
 * @param root0.onToggle
 * @param root0.showProgress
 * @param root0.title
 * @param root0.className
 */
export function Checklist({
  items,
  onToggle,
  showProgress = true,
  title,
  className,
}: ChecklistProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = items.length
  const done = items.filter((i) => i.completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className={cm.cn(cm.stack(3), className)}>
      {title && <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>}
      {showProgress && (
        <div className={cm.stack(1 as const)}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <span className={cm.textSize('xs')}>
              {t(
                'checklist.progress',
                { done, total },
                { defaultValue: `${done} of ${total} complete` },
              )}
            </span>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{pct}%</span>
          </div>
          <div className={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
            <div
              className={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      <ul className={cm.stack(2)}>
        {items.map((item) => (
          <li key={item.id} className={cm.flex({ align: 'start', gap: 'sm' })}>
            <span className={cm.shrink0}>
              <Checkbox
                checked={item.completed}
                disabled={item.disabled}
                onChange={(e) => onToggle(item.id, (e.target as HTMLInputElement).checked)}
                aria-label={typeof item.label === 'string' ? item.label : item.id}
              />
            </span>
            <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  item.completed ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                )}
                style={
                  item.completed ? { textDecoration: 'line-through', opacity: 0.6 } : undefined
                }
              >
                {item.label}
              </span>
              {item.description && <span className={cm.textSize('xs')}>{item.description}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
