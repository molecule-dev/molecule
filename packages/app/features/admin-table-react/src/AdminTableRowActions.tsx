/**
 * Kebab-menu row actions. Detached so consumers can drop it into custom
 * row layouts.
 *
 * @module
 */

import { type JSX, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import type { AdminTableRowAction } from './types.js'

/** Props for {@link AdminTableRowActions}. */
export interface AdminTableRowActionsProps<T> {
  row: T
  actions: AdminTableRowAction<T>[]
  /**
   * Accessible label for the trigger button. Overrides the translated default
   * (`adminTable.aria.rowActions`, English `'Row actions'`).
   */
  ariaLabel?: string
}

/**
 * Three-dots row actions menu. Dismisses on an outside click (mouse) or on
 * Escape (keyboard, from wherever focus sits); every item is a native
 * button/link, so the whole menu is keyboard-operable.
 */
export function AdminTableRowActions<T>({
  row,
  actions,
  ariaLabel,
}: AdminTableRowActionsProps<T>): JSX.Element {
  const cm = getClassMap()
  // The translated default when the caller passes no label; the hook re-renders
  // on a locale switch, so the name follows it like every other t() string.
  const { t } = useTranslation()
  const triggerLabel =
    ariaLabel ??
    t('adminTable.aria.rowActions', undefined, {
      defaultValue: 'Row actions',
    })
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent): void => {
      // Close only for clicks OUTSIDE the popover: clicks on the menu surface
      // or between items stay put, and each item closes the menu itself. (This
      // containment check replaces the old stopPropagation onClick on the
      // popover div, which made that div an unusable keyboard-less control.)
      const target = e.target
      if (popoverRef.current && target instanceof Node && popoverRef.current.contains(target)) {
        return
      }
      setOpen(false)
    }
    // Keyboard parity for the mouse's click-outside dismissal: Escape closes
    // from wherever focus sits (the trigger, or a tabbable menu item).
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
  return (
    <div className={cm.cn(cm.position('relative'))}>
      {/* Reuse the shared ghost icon Button (theme-aware transparent + hover surface). */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        data-mol-id="admin-table-row-actions-trigger"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {/* The ligature name is font data, not text; the button's aria-label names it. */}
        <span aria-hidden="true" className={cm.cn(cm.iconGlyphFont)} data-icon="more_vert">
          more_vert
        </span>
      </Button>
      {open ? (
        // Surface + border from theme tokens; exact popover geometry (offset,
        // width, radius, elevation) has no cm resolver, so it stays inline.
        <div
          ref={popoverRef}
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
