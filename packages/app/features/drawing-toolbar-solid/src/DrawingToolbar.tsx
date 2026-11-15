/**
 * Solid whiteboard / canvas tool selector.
 *
 * Solid counterpart of `@molecule/app-drawing-toolbar-react`'s
 * `DrawingToolbar` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { type Component, For } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { DrawingTool, DrawingToolbarProps } from './types.js'

/** The standard tool set React renders when the `tools` prop is omitted. */
const DEFAULT_TOOLS: DrawingTool[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'sticky', label: 'Sticky', icon: '🗒' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
]

/**
 * Whiteboard / canvas / annotation tool selector. Defaults to a
 * standard set of tools (select, rectangle, ellipse, arrow, text,
 * sticky, pen, eraser) but apps can pass any list. Each tool renders as a
 * `size="sm"` button — solid/primary while selected (with `aria-pressed`),
 * ghost otherwise — labelled `aria-label`/`title` from the tool's label.
 * The toolbar's own `aria-label` resolves through `t('drawingToolbar.label')`
 * with an English fallback.
 *
 * React keys each tool button by the tool's `id`, so a re-ordered or
 * re-passed array moves/keeps the rendered buttons per key. Solid's `For`
 * keys by reference, so the buttons are keyed through stable per-id records:
 * the record for an id is created once and reused (a re-pass or reversal
 * moves/keeps the rendered button, like React), while the button reads the
 * CURRENT tool for its id reactively (a changed label updates in place).
 *
 * @param props - Component props (see {@link DrawingToolbarProps}).
 * @returns The rendered toolbar.
 */
export const DrawingToolbar: Component<DrawingToolbarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const tools = (): DrawingTool[] => props.tools ?? DEFAULT_TOOLS

  /** One stable record per tool id, created on first sight. */
  interface Row {
    id: string
  }
  const rows = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const list = tools().map((tl) => {
      seen.add(tl.id)
      let row = rows.get(tl.id)
      if (!row) {
        row = { id: tl.id }
        rows.set(tl.id, row)
      }
      return row
    })
    for (const id of [...rows.keys()]) if (!seen.has(id)) rows.delete(id)
    return list
  }
  const toolFor = (id: string): DrawingTool | undefined => tools().find((tl) => tl.id === id)

  return (
    <div
      class={cm.cn(
        props.orientation === 'vertical' ? cm.stack(1) : cm.flex({ align: 'center', gap: 'xs' }),
        props.className,
      )}
      role="toolbar"
      aria-label={t('drawingToolbar.label', {}, { defaultValue: 'Drawing tools' })}
    >
      <For each={keyedRows()}>
        {(row) => {
          const tl = (): DrawingTool => toolFor(row.id) as DrawingTool
          return (
            <Button
              variant={tl().id === props.selectedId ? 'solid' : 'ghost'}
              color={tl().id === props.selectedId ? 'primary' : undefined}
              size="sm"
              onClick={() => props.onSelect?.(tl().id)}
              aria-pressed={tl().id === props.selectedId}
              aria-label={tl().label}
              title={tl().label}
            >
              {tl().icon ?? tl().label[0]}
            </Button>
          )
        }}
      </For>
      {props.extras}
    </div>
  )
}
