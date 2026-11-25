/**
 * Solid kebab-menu row actions: a three-dots trigger that opens a popover menu
 * of actions, detached so consumers can drop it into custom row layouts.
 *
 * Solid counterpart of `@molecule/app-admin-table-react`'s
 * `AdminTableRowActions` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input. Dismisses on an outside click
 * (mouse) or on Escape (keyboard, from wherever focus sits); every item is a
 * native button/link, so the whole menu is keyboard-operable.
 *
 * @module
 */

import { createEffect, createSignal, type JSX, onCleanup, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { AdminTableRowAction, AdminTableRowActionsProps } from './types.js'

/**
 * Solid three-dots row actions menu.
 *
 * @param props - Component props (see {@link AdminTableRowActionsProps}).
 * @returns The rendered row-actions menu.
 */
export function AdminTableRowActions<T>(props: AdminTableRowActionsProps<T>): JSX.Element {
  const cm = getClassMap()
  // The translated default when the caller passes no label; read inside the
  // JSX attribute, so the binding re-runs on a locale switch (React's
  // re-render parity).
  const { t } = useTranslation()
  const [open, setOpen] = createSignal(false)

  /** The popover element the outside-click check tests against. */
  let popover: HTMLDivElement | undefined

  // As in React's effect: the listeners exist only while the menu is open.
  createEffect(() => {
    if (!open()) return
    /**
     * Closes the menu for a click outside the popover; clicks on the menu
     * surface or between items stay put, and each item closes the menu itself
     * (React's containment check).
     *
     * @param event - The document click.
     */
    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target
      if (popover && target instanceof Node && popover.contains(target)) return
      setOpen(false)
    }
    /**
     * Closes the menu on Escape, from wherever focus sits.
     *
     * @param event - The document keydown.
     */
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('keydown', onDocumentKeydown)
    onCleanup(() => {
      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('keydown', onDocumentKeydown)
    })
  })

  /**
   * The menu item's class list (React's `cn(...)` for an item).
   *
   * @param action - The action.
   * @returns The class string.
   */
  const itemClass = (action: AdminTableRowAction<T>): string =>
    cm.cn(
      cm.flex({ align: 'center' }),
      cm.w('full'),
      cm.sp('px', 4),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.cursorPointer,
      // Theme-aware hover surface.
      cm.tableRowHoverable,
      // Destructive → theme error color + weight.
      action.destructive ? cm.textError : '',
      action.destructive ? cm.fontWeight('semibold') : '',
    )

  return (
    <div class={cm.cn(cm.position('relative'))}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          props.ariaLabel ??
          t('adminTable.aria.rowActions', undefined, { defaultValue: 'Row actions' })
        }
        aria-haspopup="menu"
        aria-expanded={open()}
        data-mol-id="admin-table-row-actions-trigger"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        {/* The ligature name is font data, not text; the button's aria-label names it. */}
        <span aria-hidden="true" class={cm.cn(cm.iconGlyphFont)} data-icon="more_vert">
          more_vert
        </span>
      </Button>
      <Show when={open()}>
        <div
          ref={(element: HTMLDivElement) => {
            popover = element
          }}
          class={cm.cn(cm.surface, cm.borderAll)}
          style={{
            position: 'absolute',
            top: '100%',
            right: '0px',
            'margin-top': '4px',
            'min-width': '160px',
            'z-index': '20',
            'border-radius': '8px',
            'box-shadow': '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div class={cm.cn(cm.sp('py', 1))}>
            {props.actions.map((action) => {
              const href = action.hrefFor?.(props.row)
              return (
                <Show
                  when={href}
                  fallback={
                    <button
                      class={itemClass(action)}
                      data-mol-id={action.dataMolIdFor?.(props.row)}
                      onClick={async (event) => {
                        if (props.stopActionPropagation) event.stopPropagation()
                        setOpen(false)
                        await action.onSelect(props.row)
                      }}
                    >
                      {action.label}
                    </button>
                  }
                >
                  <a
                    href={href}
                    class={itemClass(action)}
                    data-mol-id={action.dataMolIdFor?.(props.row)}
                    onClick={(event) => {
                      if (props.stopActionPropagation) event.stopPropagation()
                      setOpen(false)
                    }}
                  >
                    {action.label}
                  </a>
                </Show>
              )
            })}
          </div>
        </div>
      </Show>
    </div>
  )
}
