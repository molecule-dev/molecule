import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** A single label/value pair rendered inside a DefinitionList. */
export interface DefinitionField {
  /** Label text (usually `t('...')`). */
  label: ReactNode
  /** Rendered value. */
  value: ReactNode
  /** Optional icon rendered to the left of the label. */
  icon?: ReactNode
}

/** Props for {@link DefinitionList}. */
export interface DefinitionListProps {
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
 * @param props - Component props (see {@link DefinitionListProps}).
 */
export function DefinitionList({
  fields,
  columns = 1,
  className,
}: DefinitionListProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box
      as="dl"
      className={cm.cn(
        columns === 1 ? cm.stack(3) : cm.grid({ cols: columns, gap: 'md' }),
        className,
      )}
    >
      {fields.map((f, i) => (
        <Box as="div" key={i} className={cm.stack(0 as const)}>
          <Text
            as="dt"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
            )}
          >
            {f.icon}
            <Text as="span">{f.label}</Text>
          </Text>
          <Box as="dd" className={cm.textSize('sm')}>
            {f.value}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
