import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for the {@link WikiPageHeader} component. */
export interface WikiPageHeaderProps {
  /** Page title. */
  title: ReactNode
  /** Optional breadcrumb trail above the title. */
  breadcrumb?: ReactNode
  /** Version label ("v23", "rev. 2025-04-12"). */
  version?: ReactNode
  /** Last-updated display (relative or absolute). */
  updatedAt?: ReactNode
  /** Updated-by author display. */
  updatedBy?: ReactNode
  /** Tag chips. */
  tags?: ReactNode
  /** Called when the user clicks Edit. */
  onEdit?: () => void
  /** Called when the user clicks History. */
  onHistory?: () => void
  /** Optional extra right-side actions. */
  extraActions?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Wiki / docs / knowledge-base page header — breadcrumb +
 * title + meta row (version, updated time/by, tags) + Edit/History
 * action buttons.
 * @param props - Component props (see {@link WikiPageHeaderProps}).
 */
export function WikiPageHeader({
  title,
  breadcrumb,
  version,
  updatedAt,
  updatedBy,
  tags: tagsProp,
  onEdit,
  onHistory,
  extraActions,
  className,
}: WikiPageHeaderProps): JSX.Element {
  const tags = slot(tagsProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Box as="header" className={cm.cn(cm.stack(2), className)}>
      {breadcrumb}
      <Box
        as="div"
        className={cm.flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' })}
      >
        <Text as="h1" className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {title}
        </Text>
        <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              {t('wiki.edit', {}, { defaultValue: 'Edit' })}
            </Button>
          )}
          {onHistory && (
            <Button variant="ghost" size="sm" onClick={onHistory}>
              {t('wiki.history', {}, { defaultValue: 'History' })}
            </Button>
          )}
          {extraActions}
        </Box>
      </Box>
      <Box as="div" className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {version && (
          <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
            {version}
          </Text>
        )}
        {updatedAt && (
          <Text as="span" className={cm.textSize('xs')}>
            {t('wiki.updatedAt', {}, { defaultValue: 'Updated' })} {updatedAt}
          </Text>
        )}
        {updatedBy && (
          <Text as="span" className={cm.textSize('xs')}>
            · {updatedBy}
          </Text>
        )}
        {tags && (
          <Box as="span" className={cm.flex({ align: 'center', gap: 'xs' })}>
            {tags}
          </Box>
        )}
      </Box>
    </Box>
  )
}
