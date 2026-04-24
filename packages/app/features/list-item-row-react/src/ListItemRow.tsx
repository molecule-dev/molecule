import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ListItemRowProps {
  /** Title — first line. */
  title: ReactNode
  /** Optional second line (excerpt, description). */
  subtitle?: ReactNode
  /** Optional third line (metadata — timestamps, counts, tags). */
  metadata?: ReactNode
  /** Optional leading slot — icon, avatar, thumbnail image. */
  leading?: ReactNode
  /** Optional right-side actions (buttons, action menu). */
  actions?: ReactNode
  /** Called when the row body is clicked. */
  onClick?: () => void
  /** When true, renders with a "selected" visual state via `aria-selected`. */
  selected?: boolean
  /** When true, renders in a disabled visual state. */
  disabled?: boolean
  /** Dense vs comfortable spacing. Defaults to `'comfortable'`. */
  density?: 'comfortable' | 'compact'
  /** Extra classes. */
  className?: string
}

/**
 * Generic "thumbnail + text + actions" row — used everywhere:
 * navigation lists, mobile menus, inbox-style threads, search
 * results, picker dialogs, bookmark lists, etc.
 *
 * Different from `<RowWithActions>` in `@molecule/app-data-table-ui-react`
 * in NOT being a `<tr>` — use this for non-table lists.
 * @param root0
 * @param root0.title
 * @param root0.subtitle
 * @param root0.metadata
 * @param root0.leading
 * @param root0.actions
 * @param root0.onClick
 * @param root0.selected
 * @param root0.disabled
 * @param root0.density
 * @param root0.className
 */
export function ListItemRow({
  title,
  subtitle,
  metadata,
  leading,
  actions,
  onClick,
  selected,
  disabled,
  density = 'comfortable',
  className,
}: ListItemRowProps) {
  const cm = getClassMap()
  const padY = density === 'compact' ? 2 : 3
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-selected={selected}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', padY as 2 | 3),
        onClick && !disabled ? cm.cursorPointer : undefined,
        className,
      )}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {leading && <div className={cm.shrink0}>{leading}</div>}
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{title}</div>
        {subtitle && <div className={cm.textSize('sm')}>{subtitle}</div>}
        {metadata && <div className={cm.textSize('xs')}>{metadata}</div>}
      </div>
      {actions && (
        <div onClick={(e) => e.stopPropagation()} className={cm.shrink0}>
          {actions}
        </div>
      )}
    </div>
  )
}
