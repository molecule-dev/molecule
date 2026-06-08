/**
 * Kebab-menu row actions. Detached so consumers can drop it into custom
 * row layouts.
 *
 * @module
 */

import { type JSX, useEffect, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

import type { AdminTableRowAction } from './types.js'

interface AdminTableRowActionsProps<T> {
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
    <div className={cm.cn('relative')}>
      <button
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cm.cn('text-gray-400 hover:text-green-600 transition-colors')}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="more_vert">
          more_vert
        </span>
      </button>
      {open ? (
        <div
          className={cm.cn(
            cm.sp('mt', 1),
            'absolute right-0 z-10 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cm.sp('py', 1)}>
            {actions.map((action, i) => {
              const href = action.hrefFor?.(row)
              const className = cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.w('full'),
                'block text-left hover:bg-gray-100',
                action.destructive ? 'text-red-600' : 'text-gray-700',
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
