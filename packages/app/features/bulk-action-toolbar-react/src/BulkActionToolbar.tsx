import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 *
 */
export interface BulkAction {
  id: string
  label: ReactNode
  icon?: ReactNode
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

interface BulkActionToolbarProps {
  /** Selection count — toolbar hides when 0. */
  count: number
  /** Action buttons. */
  actions: BulkAction[]
  /** Called when "Clear selection" is clicked. */
  onClearSelection?: () => void
  /** Position — `'sticky-bottom'` (default) or `'inline'`. */
  position?: 'sticky-bottom' | 'sticky-top' | 'inline'
  /** Extra classes. */
  className?: string
}

/**
 * Selection-aware bulk action bar — appears when the user has selected
 * one or more rows, shows the count + a row of action buttons + a
 * "Clear selection" link.
 * @param root0
 * @param root0.count
 * @param root0.actions
 * @param root0.onClearSelection
 * @param root0.position
 * @param root0.className
 */
export function BulkActionToolbar({
  count,
  actions,
  onClearSelection,
  position = 'sticky-bottom',
  className,
}: BulkActionToolbarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (count <= 0) return null
  const stickyStyle: React.CSSProperties | undefined =
    position === 'sticky-bottom'
      ? { position: 'sticky', bottom: 16, zIndex: 30 }
      : position === 'sticky-top'
        ? { position: 'sticky', top: 16, zIndex: 30 }
        : undefined
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        className,
      )}
      style={stickyStyle}
    >
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
        {t('bulkActions.selected', { count }, { defaultValue: `${count} selected` })}
      </span>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        {actions.map((a) => (
          <Button
            key={a.id}
            variant={a.destructive ? 'solid' : 'ghost'}
            color={a.destructive ? 'error' : undefined}
            size="sm"
            onClick={a.onClick}
            disabled={a.disabled}
          >
            {a.icon}
            {a.label && <span>{a.label}</span>}
          </Button>
        ))}
        {onClearSelection && (
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            {t('bulkActions.clear', {}, { defaultValue: 'Clear' })}
          </Button>
        )}
      </div>
    </div>
  )
}
