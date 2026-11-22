/**
 * Top-level workspace layout with resizable panels.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `WorkspaceLayout` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. Children (`children`, the default slot)
 * are arranged in a row; a draggable vertical divider follows each pane but
 * the last, and every divider resizes its left panel. Only the trailing pane
 * flex-grows — every leading pane keeps its `flex-basis` exactly, so a drag
 * moves its edge 1:1 with the pointer.
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
 * isValidElement)` drops a text child, and the slot is flattened the same way
 * (a `Fragment` from a host that passes its children as one array).
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are the same
 * geometry React writes. All user-facing text goes through `t()` (the nested
 * `ResizeHandle`).
 *
 * @module
 */

import { defineComponent, Fragment, h, isVNode, type VNode, type VNodeChild } from 'vue'

import type { PanelConfig } from '@molecule/app-ide'
import { clampPanelSize, livePanelSize } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useWorkspace } from '@molecule/app-vue'

import { ResizeHandle } from './ResizeHandle.js'

/** Props for {@link WorkspaceLayout} — the React prop names, React's own contract. */
export interface WorkspaceLayoutProps {
  /** The panes, in row order (the default slot; React's `children`). */
  children?: VNodeChild
  /** Extra classes from the host, appended to the root's ClassMap classes. */
  className?: string
}

/**
 * Flattens a slot's nodes to the element vnodes React would keep: nested
 * arrays and fragments are walked, text/number children and the frameworks'
 * own `Text`/`Comment` vnodes (symbol types) are dropped.
 *
 * @param nodes - The slot's returned nodes.
 * @returns The element vnodes, in order.
 */
function toPanels(nodes: VNodeChild[]): VNode[] {
  const out: VNode[] = []
  const walk = (node: VNodeChild): void => {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (typeof node === 'string' || typeof node === 'number') return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!isVNode(node)) return
    if (node.type === Fragment) {
      const children = Array.isArray(node.children) ? node.children : []
      children.forEach((child) => walk(child as VNodeChild))
      return
    }
    // `Text`/`Comment` vnodes carry a symbol type; a real element's is a tag
    // string or a component definition.
    if (typeof node.type === 'symbol') return
    out.push(node)
  }
  nodes.forEach(walk)
  return out
}

/**
 * Top-level workspace layout that arranges the panes in a row with draggable
 * vertical dividers between them.
 *
 * @param props - See {@link WorkspaceLayoutProps}.
 * @returns The rendered workspace layout element.
 */
export const WorkspaceLayout = defineComponent({
  name: 'WorkspaceLayout',
  inheritAttrs: false,
  props: {
    /** Extra classes from the host, on the root. */
    className: { type: String, required: false, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { layout, resizePanel } = useWorkspace()

    /**
     * Resizes the panel before divider `index` by a pixel delta: reads the
     * panel's live size, clamps the change against the layout container's
     * measured width (1000 when jsdom/the DOM reports none) and writes the new
     * percentage back through the workspace provider.
     *
     * @param index - The divider's index (the panel it follows).
     * @param delta - The pixels moved since the last move.
     */
    const handleResize = (index: number, delta: number, panels: PanelConfig[]): void => {
      const config = panels[index]
      if (!config) return
      const containerWidth = document.querySelector('[data-workspace-layout]')?.clientWidth || 1000
      const currentSize = livePanelSize(layout.value, panels, index)
      const newSize = clampPanelSize(currentSize, delta, containerWidth)
      resizePanel(config.id, newSize)
    }

    /**
     * The leading pane's share (percent) of the two panes a divider separates —
     * the value a focusable separator reports as `aria-valuenow`.
     *
     * @param index - The divider's index (the pane before it).
     * @param panels - The visible panel configs, one per rendered pane.
     * @returns The leading pane's share of the pair, 0–100.
     */
    const leadingShare = (index: number, panels: PanelConfig[]): number => {
      const lead = livePanelSize(layout.value, panels, index)
      const trail = livePanelSize(layout.value, panels, index + 1)
      const total = lead + trail
      return total > 0 ? (lead / total) * 100 : 50
    }

    return (): VNodeChild => {
      const panels = toPanels(slots.default?.() ?? [])
      const panelConfigs = layout.value.panels
        .filter((panel) => panel.visible !== false)
        .slice(0, panels.length)
      const last = panels.length - 1
      const children: VNode[] = []
      panels.forEach((panel, index) => {
        const isTrailing = index === last
        children.push(
          h(
            'div',
            {
              class: cm.flex({ direction: 'col' }),
              style: {
                flexBasis: `${livePanelSize(layout.value, panelConfigs, index)}%`,
                flexShrink: isTrailing ? 1 : 0,
                flexGrow: isTrailing ? 1 : 0,
                minWidth: 0,
                overflow: 'hidden',
                position: 'relative',
              },
            },
            [panel],
          ),
        )
        // A divider between this pane and the next, a direct flex-row sibling
        // so it spans the full height instead of being clipped in a pane.
        if (index < last) {
          children.push(
            h(ResizeHandle, {
              direction: 'horizontal',
              value: leadingShare(index, panelConfigs),
              onResize: (delta: number) => handleResize(index, delta, panelConfigs),
            }),
          )
        }
      })
      return h(
        'div',
        {
          'data-workspace-layout': '',
          class: cm.cn(cm.flex({ direction: 'row' }), cm.w('full'), cm.h('full'), props.className),
          style: { overflow: 'hidden', minHeight: 0 },
        },
        children,
      )
    }
  },
})
