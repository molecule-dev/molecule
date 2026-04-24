import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface RowWithActionsProps {
  /** Row cells (each wrapped in `<td>`). */
  children: ReactNode
  /** Action buttons/menu to render in the trailing "actions" cell. */
  actions?: ReactNode
  /** Called when the row body is clicked (not the actions cell). */
  onClick?: () => void
  /** Whether the row should render in a "selected" visual state. */
  selected?: boolean
  /** Extra classes on the `<tr>`. */
  className?: string
}

/**
 * `<tr>` wrapper that adds a trailing actions cell plus a click handler
 * on the body. Useful for data tables where each row has a trailing
 * ellipsis-menu or a row of action buttons.
 * @param root0
 * @param root0.children
 * @param root0.actions
 * @param root0.onClick
 * @param root0.selected
 * @param root0.className
 */
export function RowWithActions({
  children,
  actions,
  onClick,
  selected,
  className,
}: RowWithActionsProps) {
  const cm = getClassMap()
  return (
    <tr
      onClick={onClick}
      aria-selected={selected}
      className={cm.cn(onClick ? cm.cursorPointer : undefined, className)}
    >
      {children}
      {actions !== undefined && (
        <td onClick={(e) => e.stopPropagation()} className={cm.cn(cm.textCenter)}>
          {actions}
        </td>
      )}
    </tr>
  )
}
