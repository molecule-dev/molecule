/**
 * Kebab-menu row actions. Detached so consumers can drop it into custom
 * row layouts.
 *
 * @module
 */

import { type JSX, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { type ElementHandle, getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Anchor, Box, Pressable, Text } from '@molecule/app-ui-react/elements'
import { OverlayPortal, useOverlayLayer } from '@molecule/app-ui-react/platform'

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
  /** Keep selection within a clickable row. */
  stopActionPropagation?: boolean
}

/**
 * Three-dots row actions menu. Dismisses on an outside click (mouse) or on
 * Escape (keyboard, from wherever focus sits); every item is a button or a
 * link, so the whole menu is keyboard-operable.
 */
export function AdminTableRowActions<T>({
  row,
  actions,
  ariaLabel,
  stopActionPropagation,
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
  const root = useRef<ElementHandle>(null)
  const menu = useRef<ElementHandle>(null)
  const layer = useOverlayLayer({
    open,
    kind: 'popover',
    surface: menu,
    anchor: root,
    dismissKey: true,
    outside: { inside: [root, menu], phase: 'activate' },
    onDismiss: () => setOpen(false),
  })
  return (
    <Box as="div" ref={root} className={cm.cn(cm.position('relative'))}>
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
        <Text
          as="span"
          aria-hidden="true"
          className={cm.cn(cm.iconGlyphFont)}
          data-icon="more_vert"
        >
          more_vert
        </Text>
      </Button>
      {open ? (
        <OverlayPortal layer={layer} presentation="inline" server="inline">
          <Box
            as="div"
            ref={menu}
            className={cm.cn(cm.surface, cm.borderAll)}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              minWidth: 160,
              zIndex: 20,
              borderRadius: 8,
            }}
            webStyle={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          >
            <Box as="div" className={cm.cn(cm.sp('py', 1))}>
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
                    <Anchor
                      key={i}
                      href={href}
                      className={className}
                      data-mol-id={action.dataMolIdFor?.(row)}
                      onClick={(event) => {
                        if (stopActionPropagation) event.stopPropagation()
                        setOpen(false)
                      }}
                    >
                      {action.label}
                    </Anchor>
                  )
                }
                return (
                  <Pressable
                    as="button"
                    key={i}
                    className={className}
                    data-mol-id={action.dataMolIdFor?.(row)}
                    onClick={async (event) => {
                      if (stopActionPropagation) event.stopPropagation()
                      setOpen(false)
                      await action.onSelect(row)
                    }}
                  >
                    {action.label}
                  </Pressable>
                )
              })}
            </Box>
          </Box>
        </OverlayPortal>
      ) : null}
    </Box>
  )
}

export default AdminTableRowActions
