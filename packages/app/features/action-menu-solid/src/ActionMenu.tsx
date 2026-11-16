/**
 * Solid kebab / overflow action menu: a trigger button that opens a popover
 * list of actions.
 *
 * Solid counterpart of `@molecule/app-action-menu-react`'s `ActionMenu` — the
 * same props (React names), the same DOM for the same input, and the same
 * click callbacks.
 *
 * @module
 */

import { type Component, createEffect, createSignal, For, onCleanup, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { ActionMenuItem, ActionMenuProps } from './types.js'

/** A row identity record: created once per item id and reused while the id is present. */
interface Row {
  id: string
}

/**
 * Compact overflow / kebab menu button that opens a popover list of actions on
 * click. Closes on outside-click and Escape.
 *
 * Pure uncontrolled — the component manages its own open state.
 *
 * React keys each row by the item's `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the row's content reads the CURRENT item for that id
 * reactively.
 *
 * @param props - Component props (see {@link ActionMenuProps}).
 * @returns The rendered action menu.
 */
export const ActionMenu: Component<ActionMenuProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [open, setOpen] = createSignal(false)

  /** The trigger's label: the prop when given, else the translated default. */
  const triggerLabel = (): string =>
    props.triggerAriaLabel ?? t('actionMenu.aria.trigger', undefined, { defaultValue: 'Actions' })

  /** The wrapper element the outside-mousedown check tests against. */
  let wrapper: HTMLSpanElement | undefined

  // As in React's effect: the listeners exist only while the menu is open.
  createEffect(() => {
    if (!open()) return
    /**
     * Closes the menu when a mousedown occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (!wrapper?.contains(event.target as Node)) setOpen(false)
    }
    /**
     * Closes the menu when the Escape key is pressed.
     * @param event - The document keydown.
     */
    const onEsc = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    onCleanup(() => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    })
  })

  /** One stable record per item id, created on first sight. */
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.items.map((item) => {
      seen.add(item.id)
      let row = records.get(item.id)
      if (!row) {
        row = { id: item.id }
        records.set(item.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const itemFor = (id: string): ActionMenuItem =>
    props.items.find((item) => item.id === id) as ActionMenuItem

  /** The menu's alignment: React's `align = 'right'` default. */
  const alignment = (): 'left' | 'right' => props.align ?? 'right'

  /**
   * The classes of an item rendered as a button (React's button branch).
   * @param item - The item.
   * @returns The class string.
   */
  const buttonClasses = (item: ActionMenuItem): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.w('full'),
      cm.sp('px', 2),
      cm.sp('py', 2),
      cm.textSize('sm'),
      item.destructive && cm.textError,
      item.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )

  /**
   * The classes of an item rendered as an anchor (React's anchor branch, which
   * has no `w('full')`).
   * @param item - The item.
   * @returns The class string.
   */
  const anchorClasses = (item: ActionMenuItem): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 2),
      cm.sp('py', 2),
      cm.textSize('sm'),
      item.destructive && cm.textError,
      item.destructive ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )

  return (
    <span
      ref={(element) => {
        wrapper = element
      }}
      class={cm.cn(cm.position('relative'), props.className)}
      style={{ display: 'inline-block' }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-label={triggerLabel()}
        aria-haspopup="menu"
        aria-expanded={open()}
        data-mol-id="action-menu-trigger"
      >
        <Show when={props.trigger !== undefined && props.trigger !== null} fallback={'⋮'}>
          {props.trigger}
        </Show>
      </Button>
      <Show when={open()}>
        <ul
          role="menu"
          data-mol-id="action-menu-list"
          class={cm.cn(cm.stack(0 as const), cm.sp('p', 1), cm.surface, cm.borderAll)}
          style={{
            position: 'absolute',
            top: '100%',
            [alignment()]: '0px',
            'min-width': '160px',
            'z-index': '50',
            'border-radius': '8px',
            'box-shadow': '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <For each={keyedRows()}>
            {(row) => (
              <li role="none">
                <Show
                  when={itemFor(row.id).href}
                  fallback={
                    <button
                      type="button"
                      role="menuitem"
                      data-mol-id={`action-menu-item-${row.id}`}
                      onClick={() => {
                        const item = itemFor(row.id)
                        if (item.disabled) return
                        item.onClick?.()
                        setOpen(false)
                      }}
                      disabled={itemFor(row.id).disabled}
                      class={buttonClasses(itemFor(row.id))}
                    >
                      {itemFor(row.id).icon}
                      <span>{itemFor(row.id).label}</span>
                    </button>
                  }
                >
                  <a
                    href={itemFor(row.id).href}
                    role="menuitem"
                    data-mol-id={`action-menu-item-${row.id}`}
                    onClick={() => setOpen(false)}
                    class={anchorClasses(itemFor(row.id))}
                    style={{ opacity: itemFor(row.id).disabled ? 0.5 : 1 }}
                  >
                    {itemFor(row.id).icon}
                    <span>{itemFor(row.id).label}</span>
                  </a>
                </Show>
                <Show when={itemFor(row.id).divider}>
                  <span
                    aria-hidden="true"
                    class={cm.cn(cm.displayBlock, cm.bgBorder)}
                    style={{ height: '1px', margin: '4px 0px' }}
                  />
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </span>
  )
}
