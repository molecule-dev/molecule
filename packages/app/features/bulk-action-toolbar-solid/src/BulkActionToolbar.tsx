import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { BulkAction, BulkActionToolbarProps } from './types.js'

/** React's sticky-bottom inline style, written to the DOM the way React writes it. */
const STICKY_BOTTOM = { position: 'sticky', bottom: '16px', 'z-index': 30 } as const

/** React's sticky-top inline style, written to the DOM the way React writes it. */
const STICKY_TOP = { position: 'sticky', top: '16px', 'z-index': 30 } as const

/**
 * Selection-aware bulk action bar — appears when the user has selected one
 * or more rows, shows the count + a row of action buttons + a "Clear
 * selection" link.
 *
 * Renders nothing while `count <= 0` (`<Show>` renders no element, the way
 * React's component returns null). `position` defaults to `'sticky-bottom'`
 * (16px inset, z-30); `'sticky-top'` and `'inline'` are also supported.
 * Destructive actions render as solid error-colored buttons.
 *
 * React keys each action button by the action's `id`, so a re-ordered or
 * re-passed array moves/keeps the rendered buttons per key. Solid's `For`
 * keys by reference, so the buttons are keyed through stable per-id records:
 * the record for an id is created once and reused (a re-pass or reversal
 * moves/keeps the rendered button, like React), while the button reads the
 * CURRENT action for its id reactively (a changed label updates in place).
 *
 * This is the Solid counterpart of `@molecule/app-bulk-action-toolbar-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @param props - Component props (see {@link BulkActionToolbarProps}).
 * @returns The rendered toolbar.
 */
export const BulkActionToolbar: Component<BulkActionToolbarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** One stable record per action id, created on first sight. */
  interface Row {
    id: string
  }
  const rows = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const list = props.actions.map((a) => {
      seen.add(a.id)
      let row = rows.get(a.id)
      if (!row) {
        row = { id: a.id }
        rows.set(a.id, row)
      }
      return row
    })
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id)
    return list
  }
  const actionFor = (id: string): BulkAction | undefined => props.actions.find((a) => a.id === id)

  /**
   * React's sticky inline style for the current position — undefined for
   * `'inline'`, the way React leaves the style off.
   * @returns The style object, or undefined.
   */
  const stickyStyle = (): typeof STICKY_BOTTOM | typeof STICKY_TOP | undefined =>
    (props.position ?? 'sticky-bottom') === 'sticky-bottom'
      ? STICKY_BOTTOM
      : (props.position ?? 'sticky-bottom') === 'sticky-top'
        ? STICKY_TOP
        : undefined

  return (
    <Show when={props.count > 0}>
      <div
        role="region"
        aria-label="Bulk actions"
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          props.className,
        )}
        style={stickyStyle()}
      >
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t(
            'bulkActions.selected',
            { count: props.count },
            { defaultValue: '{{count}} selected' },
          )}
        </span>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          <For each={keyedRows()}>
            {(row) => {
              const action = (): BulkAction => actionFor(row.id) as BulkAction
              return (
                <Button
                  variant={action().destructive ? 'solid' : 'ghost'}
                  color={action().destructive ? 'error' : undefined}
                  size="sm"
                  onClick={action().onClick}
                  disabled={action().disabled}
                >
                  {action().icon}
                  {action().label ? <span>{action().label}</span> : undefined}
                </Button>
              )
            }}
          </For>
          <Show when={props.onClearSelection}>
            <Button variant="ghost" size="sm" onClick={props.onClearSelection}>
              {t('bulkActions.clear', {}, { defaultValue: 'Clear' })}
            </Button>
          </Show>
        </div>
      </div>
    </Show>
  )
}
