/**
 * Kebab-menu row actions. Detached so consumers can drop it into custom
 * row layouts.
 *
 * @module
 */

import { type JSX, useEffect, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import type { AdminTableRowAction } from './types.js'

export interface AdminTableRowActionsProps<T> {
  row: T
  actions: AdminTableRowAction<T>[]
  ariaLabel: string
}

/** Three-dots row actions menu. */
export function AdminTableRowActions<T>({
  row,
  actions,
  ariaLabel,
}: AdminTableRowActionsProps<T>): JSX.Element {
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const handler = (): void => setOpen(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])
  return (
    <div className={cm.cn(cm.position('relative'))}>
      {/* Reuse the shared ghost icon Button (theme-aware transparent + hover surface). */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        data-mol-id="admin-table-row-actions-trigger"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="more_vert">
          more_vert
        </span>
      </Button>
      {open ? (
        // Surface + border from theme tokens; exact popover geometry (offset,
        // width, radius, elevation) has no cm resolver, so it stays inline.
        <div
          className={cm.cn(cm.surface, cm.borderAll)}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 160,
            zIndex: 20,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cm.cn(cm.sp('py', 1))}>
            {actions.map((action, i) => {
              const href = action.hrefFor?.(row)
              const className = cm.cn(
                cm.flex({ align: 'center' }),
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.cursorPointer,
                // Theme-aware hover surface (was hover:bg-gray-100).
                cm.tableRowHoverable,
                // Destructive → theme error color + weight; default inherits foreground.
                action.destructive ? cm.textError : '',
                action.destructive ? cm.fontWeight('semibold') : '',
              )
              if (href) {
                return (
                  <a
                    key={i}
                    href={href}
                    className={className}
                    data-mol-id={action.dataMolIdFor?.(row)}
                    onClick={() => setOpen(false)}
                  >
                    {action.label}
                  </a>
                )
              }
              return (
                <button
                  key={i}
                  className={className}
                  data-mol-id={action.dataMolIdFor?.(row)}
                  onClick={async () => {
                    setOpen(false)
                    await action.onSelect(row)
                  }}
                >
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminTableRowActions
