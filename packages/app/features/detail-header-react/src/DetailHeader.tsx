import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link DetailHeader}. */
export interface DetailHeaderProps {
  /** Primary heading. */
  title: ReactNode
  /** Optional subtitle shown below the title. */
  subtitle?: ReactNode
  /** Optional leading avatar / icon / logo. */
  leading?: ReactNode
  /** Optional status indicator (e.g. `<StatusBadge>` or `<StatusPill>`). */
  status?: ReactNode
  /** Right-aligned actions. */
  actions?: ReactNode
  /** Optional metadata row rendered below the main row (chips / secondary fields). */
  meta?: ReactNode
  /** Optional search slot (rendered to the left of the actions). */
  search?: ReactNode
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Header row for a detail page — leading slot + title/subtitle + status +
 * actions, with optional meta row and search slot.
 *
 * Different from `<PageHeader>` (used at the top of list/index pages)
 * in prioritising status + search + stickiness.
 * @param props - Component props (see {@link DetailHeaderProps}).
 */
export function DetailHeader({
  title,
  subtitle: subtitleProp,
  leading,
  status,
  actions,
  meta: metaProp,
  search,
  sticky,
  className,
  dataMolId,
}: DetailHeaderProps): JSX.Element {
  const subtitle = slot(subtitleProp)
  const meta = slot(metaProp)
  const cm = getClassMap()
  return (
    <Box
      as="header"
      data-mol-id={dataMolId}
      className={cm.cn(cm.stack(2), className)}
      webStyle={sticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}
    >
      <Box
        as="div"
        className={cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' })}
      >
        <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
          {leading}
          <Box as="div" className={cm.stack(1 as const)}>
            <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
              <Text as="h1" className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                {title}
              </Text>
              {status}
            </Box>
            {subtitle && (
              <Text as="p" className={cm.textSize('sm')}>
                {subtitle}
              </Text>
            )}
          </Box>
        </Box>
        <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
          {search}
          {actions}
        </Box>
      </Box>
      {meta && (
        <Box as="div" className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {meta}
        </Box>
      )}
    </Box>
  )
}
