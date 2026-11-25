import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Checkbox } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** A single item in the checklist, tracking its label, description, and completion state. */
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

/** Props for {@link Checklist}. */
export interface ChecklistProps {
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
 * @param props - Component props (see {@link ChecklistProps}).
 */
export function Checklist({
  items,
  onToggle,
  showProgress = true,
  title: titleProp,
  className,
}: ChecklistProps): JSX.Element {
  const title = slot(titleProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = items.length
  const done = items.filter((i) => i.completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <Box as="div" className={cm.cn(cm.stack(3), className)}>
      {title && (
        <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {title}
        </Text>
      )}
      {showProgress && (
        <Box as="div" className={cm.stack(1 as const)}>
          <Box as="div" className={cm.flex({ justify: 'between', align: 'center' })}>
            <Text as="span" className={cm.textSize('xs')}>
              {t(
                'checklist.progress',
                { done, total },
                { defaultValue: '{{done}} of {{total}} complete' },
              )}
            </Text>
            <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {pct}%
            </Text>
          </Box>
          <Box as="div" className={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
            <Box
              as="div"
              className={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
              style={{ width: `${pct}%` }}
            />
          </Box>
        </Box>
      )}
      <Box as="ul" className={cm.stack(2)}>
        {items.map((item) => (
          <Box as="li" key={item.id} className={cm.flex({ align: 'start', gap: 'sm' })}>
            <Box as="span" className={cm.shrink0}>
              <Checkbox
                checked={item.completed}
                disabled={item.disabled}
                onChange={(e) => onToggle(item.id, (e.target as HTMLInputElement).checked)}
                aria-label={typeof item.label === 'string' ? item.label : item.id}
              />
            </Box>
            <Box as="div" className={cm.cn(cm.flex1, cm.stack(0 as const))}>
              <Box
                as="span"
                className={cm.cn(
                  cm.textSize('sm'),
                  item.completed ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                )}
                style={item.completed ? { opacity: 0.6 } : undefined}
                webStyle={item.completed ? { textDecoration: 'line-through' } : undefined}
              >
                {item.label}
              </Box>
              {item.description && (
                <Box as="span" className={cm.textSize('xs')}>
                  {item.description}
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
