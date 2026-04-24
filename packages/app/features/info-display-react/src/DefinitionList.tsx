import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface DefinitionField {
  /** Label text (usually `t('...')`). */
  label: ReactNode
  /** Rendered value. */
  value: ReactNode
  /** Optional icon rendered to the left of the label. */
  icon?: ReactNode
}

interface DefinitionListProps {
  /** Fields to render. */
  fields: DefinitionField[]
  /** Grid column count. */
  columns?: 1 | 2 | 3
  /** Extra classes. */
  className?: string
}

/**
 * Structured label/value pair list. Use standalone or inside
 * `<InfoCard>`. Apps pass already-formatted values (dates, currency,
 * status pills, etc.) as ReactNodes.
 * @param root0
 * @param root0.fields
 * @param root0.columns
 * @param root0.className
 */
export function DefinitionList({ fields, columns = 1, className }: DefinitionListProps) {
  const cm = getClassMap()
  return (
    <dl
      className={cm.cn(
        columns === 1 ? cm.stack(3) : cm.grid({ cols: columns, gap: 'md' }),
        className,
      )}
    >
      {fields.map((f, i) => (
        <div key={i} className={cm.stack(0 as const)}>
          <dt
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
            )}
          >
            {f.icon}
            <span>{f.label}</span>
          </dt>
          <dd className={cm.textSize('sm')}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
