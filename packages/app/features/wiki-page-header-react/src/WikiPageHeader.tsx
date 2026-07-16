import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

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
  tags,
  onEdit,
  onHistory,
  extraActions,
  className,
}: WikiPageHeaderProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header className={cm.cn(cm.stack(2), className)}>
      {breadcrumb}
      <div className={cm.flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{title}</h1>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
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
        </div>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {version && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{version}</span>
        )}
        {updatedAt && (
          <span className={cm.textSize('xs')}>
            {t('wiki.updatedAt', {}, { defaultValue: 'Updated' })} {updatedAt}
          </span>
        )}
        {updatedBy && <span className={cm.textSize('xs')}>· {updatedBy}</span>}
        {tags && <span className={cm.flex({ align: 'center', gap: 'xs' })}>{tags}</span>}
      </div>
    </header>
  )
}
