/**
 * Top-level workspace layout with resizable panels.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `WorkspaceLayout` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. Children (`children`) are arranged in a
 * row; a draggable vertical divider follows each pane but the last, and every
 * divider resizes its left panel. Only the trailing pane flex-grows — every
 * leading pane keeps its `flex-basis` exactly, so a drag moves its edge 1:1
 * with the pointer.
 *
 * The panel configs are reconciled to the children actually rendered: the
 * default layout declares three panels (chat/editor/preview), but a host
 * commonly renders only two (chat + a combined main pane), so the visible
 * configs are taken one per rendered child, in order; a pane past the last
 * config falls back to an equal split (`livePanelSize`). The new size from a
 * drag or key press is written back through `resizePanel`, so it persists in
 * workspace state.
 *
 * Only element children are panels — React's `Children.toArray(...).filter(
 * isValidElement)` drops a text child, and the resolved children are filtered
 * the same way (nested arrays flattened).
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are the same
 * geometry React writes (Solid's style objects take kebab-case keys, which
 * jsdom composes into the same `flex` shorthand React's longhands serialize
 * to). All user-facing text goes through `t()` (the nested `ResizeHandle`).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { children, createMemo, For, Show } from 'solid-js'

import type { PanelConfig } from '@molecule/app-ide'
import { clampPanelSize, livePanelSize } from '@molecule/app-ide-panel-logic'
import { useWorkspace } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { ResizeHandle } from './ResizeHandle.jsx'

/** Props for {@link WorkspaceLayout} — the React prop names, React's own contract. */
export interface WorkspaceLayoutProps {
  /** The panes, in row order (React's `children`). */
  children?: JSX.Element
  /** Extra classes from the host, appended to the root's ClassMap classes. */
  className?: string
}

/**
 * Flattens resolved children to the element nodes React would keep, dropping
 * text nodes and nested arrays walked in order.
 *
 * @param value - What Solid's `children` helper resolved `children` to.
 * @returns The element nodes, in order.
 */
function toPanels(value: unknown): Element[] {
  const out: Element[] = []
  const walk = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(walk)
      return
    }
    if (item instanceof Node && item.nodeType === 1) out.push(item as Element)
  }
  walk(value)
  return out
}

/**
 * Top-level workspace layout that arranges the panes in a row with draggable
 * vertical dividers between them.
 *
 * @param props - See {@link WorkspaceLayoutProps}.
 * @returns The rendered workspace layout element.
 */
export function WorkspaceLayout(props: WorkspaceLayoutProps): JSX.Element {
  const cm = getClassMap()
  const { layout, resizePanel } = useWorkspace()
  const resolved = children(() => props.children)

  /** The rendered panes, in row order. */
  const panels = createMemo(() => toPanels(resolved()))

  /** The visible panel configs taken one per rendered pane, in order. */
  const panelConfigs = createMemo(() =>
    layout()
      .panels.filter((panel) => panel.visible !== false)
      .slice(0, panels().length),
  )

  /**
   * Resizes the panel before divider `index` by a pixel delta: reads the
   * panel's live size, clamps the change against the layout container's
   * measured width (1000 when the DOM reports none) and writes the new
   * percentage back through the workspace provider.
   *
   * @param index - The divider's index (the panel it follows).
   * @param delta - The pixels moved since the last move.
   */
  const handleResize = (index: number, delta: number): void => {
    const configs: PanelConfig[] = panelConfigs()
    const config = configs[index]
    if (!config) return
    const containerWidth = document.querySelector('[data-workspace-layout]')?.clientWidth || 1000
    const currentSize = livePanelSize(layout(), configs, index)
    const newSize = clampPanelSize(currentSize, delta, containerWidth)
    resizePanel(config.id, newSize)
  }

  /**
   * The pane's inline geometry: its size as the flex basis, and whether it is
   * the trailing pane that absorbs the leftover space.
   *
   * @param index - The pane's index in the row.
   * @param trailing - Whether it is the last pane.
   * @returns The style object.
   */
  const panelStyle = (index: number, trailing: boolean): JSX.CSSProperties => ({
    'flex-basis': `${livePanelSize(layout(), panelConfigs(), index)}%`,
    'flex-shrink': trailing ? '1' : '0',
    'flex-grow': trailing ? '1' : '0',
    'min-width': '0px',
    overflow: 'hidden',
    position: 'relative',
  })

  /**
   * The leading pane's share (percent) of the two panes a divider separates —
   * the value a focusable separator reports as `aria-valuenow`.
   *
   * @param index - The divider's index (the pane before it).
   * @returns The leading pane's share of the pair, 0–100.
   */
  const leadingShare = (index: number): number => {
    const configs = panelConfigs()
    const lead = livePanelSize(layout(), configs, index)
    const trail = livePanelSize(layout(), configs, index + 1)
    const total = lead + trail
    return total > 0 ? (lead / total) * 100 : 50
  }

  return (
    <div
      data-workspace-layout=""
      class={cm.cn(cm.flex({ direction: 'row' }), cm.w('full'), cm.h('full'), props.className)}
      style={{ overflow: 'hidden', 'min-height': '0px' }}
    >
      <For each={panels()}>
        {(panel, index) => {
          const trailing = (): boolean => index() === panels().length - 1
          return (
            <>
              <div class={cm.flex({ direction: 'col' })} style={panelStyle(index(), trailing())}>
                {panel}
              </div>
              {/* A divider between this pane and the next, a direct flex-row
                  sibling so it spans the full height. */}
              <Show when={index() < panels().length - 1}>
                <ResizeHandle
                  direction="horizontal"
                  value={leadingShare(index())}
                  onResize={(delta: number) => handleResize(index(), delta)}
                />
              </Show>
            </>
          )
        }}
      </For>
    </div>
  )
}
