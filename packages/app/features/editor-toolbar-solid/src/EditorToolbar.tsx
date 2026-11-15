/**
 * Solid editor-page top toolbar.
 *
 * Solid counterpart of `@molecule/app-editor-toolbar-react`'s `EditorToolbar` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { EditorToolbarProps, ToolbarAction } from './types.js'

/** React's sticky inline style, written to the DOM the way React writes it. */
const STICKY_STYLE = { position: 'sticky', top: '0px', 'z-index': 10 } as const

/** React's divider inline style, written to the DOM the way React writes it. */
const DIVIDER_STYLE = {
  width: '1px',
  height: '24px',
  opacity: 0.2,
  background: 'currentColor',
} as const

/**
 * Editor-page top toolbar — title + optional version/status badge + primary
 * actions (Save, Publish, Test) + secondary icon actions.
 *
 * Renders React's exact DOM: the title row (leading, `<h1>`, badge) and the
 * actions row, with the same ClassMap tokens, the 1px divider between
 * non-empty primary and secondary groups, and the sticky inline style by
 * default (`sticky` defaults to true). Action `label`s render verbatim — the
 * component has no `t()` calls of its own.
 *
 * React keys each action button by `p-<id>` / `s-<id>`, so a re-ordered or
 * re-passed array moves/keeps the rendered buttons per key. Solid's `For`
 * keys by reference, so the primary buttons are keyed through stable per-id
 * records — the record for an id is created once and reused, while the button
 * reads the CURRENT action for its id reactively (a changed label updates in
 * place).
 *
 * @param props - Component props (see {@link EditorToolbarProps}).
 * @returns The rendered toolbar.
 */
export const EditorToolbar: Component<EditorToolbarProps> = (props) => {
  const cm = getClassMap()

  const primaryActions = (): ToolbarAction[] => props.primaryActions ?? []
  const secondaryActions = (): ToolbarAction[] => props.secondaryActions ?? []

  /** One stable record per primary action id, created on first sight. */
  interface Row {
    id: string
  }
  const rows = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const list = primaryActions().map((action) => {
      seen.add(action.id)
      let row = rows.get(action.id)
      if (!row) {
        row = { id: action.id }
        rows.set(action.id, row)
      }
      return row
    })
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id)
    return list
  }
  const actionFor = (id: string): ToolbarAction | undefined =>
    primaryActions().find((action) => action.id === id)

  /**
   * Renders one toolbar action as a Button, wrapped in a plain anchor when it
   * carries an href — React's `renderAction`. The action is read through an
   * accessor so its props stay reactive across updates.
   *
   * @param action - Accessor for the action to render.
   * @returns The action's element.
   */
  const renderAction = (action: () => ToolbarAction): JSX.Element => {
    const button = (
      <Button
        variant={action().variant ?? 'ghost'}
        color={action().color}
        onClick={action().onClick}
        disabled={action().disabled}
      >
        {action().icon}
        {action().label ? <span>{action().label}</span> : undefined}
      </Button>
    )
    return action().href ? <a href={action().href}>{button}</a> : button
  }

  return (
    <div
      data-mol-id={props.dataMolId}
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        props.className,
      )}
      style={(props.sticky ?? true) ? STICKY_STYLE : undefined}
    >
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {props.leading}
        <h1 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h1>
        {props.badge}
      </div>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <For each={keyedRows()}>
          {(row) => renderAction(() => actionFor(row.id) as ToolbarAction)}
        </For>
        <Show when={secondaryActions().length > 0 && primaryActions().length > 0}>
          <span aria-hidden="true" style={DIVIDER_STYLE} />
        </Show>
        <For each={secondaryActions()}>{(action) => renderAction(() => action)}</For>
      </div>
    </div>
  )
}
