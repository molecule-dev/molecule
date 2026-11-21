/**
 * Vue mind-map canvas: the Vue counterpart of
 * `@molecule/app-mind-map-canvas-react`'s `<MindMapCanvas>` — the same props
 * (React names), the same ClassMap classes, the same inline geometry and the
 * same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  nextTick,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import {
  CanvasEdge,
  type CanvasItemId,
  CanvasNode,
  CanvasSurface,
  type Point,
} from '@molecule/app-feature-canvas-vue'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import {
  computeHorizontalTreePositions,
  computeRadialPositions,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
} from './layout.js'
import { addChild, setNodeText, toggleCollapsed } from './tree.js'
import type { MindMapLayout, MindMapLayoutResult, MindMapNode } from './types.js'

/**
 * Mind-map canvas — a thin domain wrapper over
 * `@molecule/app-feature-canvas-vue`. Composes `<CanvasSurface>` for
 * pan/zoom, `<CanvasNode>` for each tree node, and `<CanvasEdge
 * kind="bezier">` for parent → child links. Domain-specific behavior
 * lives here, not in the base:
 *
 * - **Auto-layout** — radial / horizontal / vertical positions are
 *   computed from the tree shape via the pure helpers in `./layout.js`.
 * - **Fold / unfold** — the +/- toggle on a non-leaf node flips
 *   `collapsed`, hiding (or revealing) the entire subtree.
 * - **Inline edit** — double-click any node body to enter an inline
 *   `<input>`; commit on Enter / blur, cancel on Escape.
 * - **Add child** — the `+` button on every node appends a new child
 *   ("New idea") and auto-expands the parent.
 *
 * Pan / zoom is owned by `<CanvasSurface>`; this wrapper never
 * re-implements those mechanics.
 *
 * Style is driven by `getClassMap()`. Inline styles are reserved for
 * canvas-space geometry and the optional accent border.
 *
 * @param props - Component props (see {@link MindMapCanvasProps}).
 * @returns The mind-map canvas component.
 */
export const MindMapCanvas = defineComponent({
  name: 'MindMapCanvas',
  props: {
    root: { type: Object as PropType<MindMapNode>, required: true },
    onChange: { type: Function as PropType<(next: MindMapNode) => void>, default: undefined },
    layout: { type: String as PropType<MindMapLayout>, default: 'radial' },
    width: { type: Number, default: 800 },
    height: { type: Number, default: 600 },
    nodeWidth: { type: Number, default: DEFAULT_NODE_WIDTH },
    nodeHeight: { type: Number, default: DEFAULT_NODE_HEIGHT },
    onNodeClick: { type: Function as PropType<(node: MindMapNode) => void>, default: undefined },
    onNodeEdit: {
      type: Function as PropType<(id: string, text: string) => void>,
      default: undefined,
    },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // Internal mirror used in uncontrolled mode (React's `useState`): the
    // initial props are read once, at mount.
    const internalRoot = ref<MindMapNode>(props.root)
    const editingId = ref<string | null>(null)
    const editingDraft = ref('')
    const editInputRef = ref<HTMLInputElement | null>(null)

    // Move focus into the freshly-mounted inline editor (the WAI-ARIA
    // inline-edit pattern) without `autoFocus`, which jsx-a11y forbids.
    watch(editingId, (id) => {
      if (id != null) {
        void nextTick(() => {
          editInputRef.value?.focus()
        })
      }
    })

    /** Whether `onChange` makes the canvas controlled. */
    const controlled = (): boolean => typeof props.onChange === 'function'
    /** The root the canvas renders. */
    const root = (): MindMapNode => (controlled() ? props.root : internalRoot.value)

    /**
     * Push a tree mutation through either the controlled callback or the
     * internal state mirror.
     *
     * @param next - The replacement root after the mutation.
     */
    const commit = (next: MindMapNode): void => {
      if (controlled()) props.onChange?.(next)
      else internalRoot.value = next
    }

    /**
     * The layout of the current tree (React's `useMemo` body, recomputed
     * per render).
     *
     * @returns Positions, edges and the visible nodes.
     */
    const layoutResult = (): MindMapLayoutResult => {
      const opts = {
        nodeWidth: props.nodeWidth,
        nodeHeight: props.nodeHeight,
        origin: { x: props.width / 2, y: props.height / 2 } satisfies Point,
      }
      if (props.layout === 'radial') return computeRadialPositions(root(), opts)
      return computeHorizontalTreePositions(
        root(),
        { ...opts, origin: { x: props.nodeWidth, y: props.height / 2 } },
        props.layout === 'vertical' ? 'vertical' : 'horizontal',
      )
    }

    /**
     * Begin an inline-edit on the given node — seeds the draft with the
     * current text and stops surface pan via `e.stopPropagation()`.
     *
     * @param node - Node to start editing.
     * @param e - The triggering event.
     */
    const beginEdit = (node: MindMapNode, e: Event): void => {
      e.stopPropagation()
      editingId.value = node.id
      editingDraft.value = node.text
    }

    /**
     * Commit the current draft to the tree (calls `onNodeEdit` after
     * `commit`) and exit edit mode.
     */
    const commitEdit = (): void => {
      if (editingId.value == null) return
      const id = editingId.value
      const text = editingDraft.value
      editingId.value = null
      editingDraft.value = ''
      commit(setNodeText(root(), id, text))
      props.onNodeEdit?.(id, text)
    }

    /** Cancel edit mode without committing. */
    const cancelEdit = (): void => {
      editingId.value = null
      editingDraft.value = ''
    }

    /**
     * Handle key events inside the inline-edit input — Enter commits,
     * Escape cancels, every other key bubbles normally.
     *
     * @param e - Keyboard event from the input.
     */
    const onEditKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
      }
    }

    return (): VNode => {
      const currentRoot = root()
      const { positions, edges, visibleNodes } = layoutResult()

      // Edge endpoints connect node-center → node-center so the bezier
      // looks natural in every layout.
      const edgeEndpoints = edges.map((e) => {
        const p = positions.get(e.parentId)!
        const c = positions.get(e.childId)!
        const fromCenter: Point = { x: p.x + props.nodeWidth / 2, y: p.y + props.nodeHeight / 2 }
        const toCenter: Point = { x: c.x + props.nodeWidth / 2, y: c.y + props.nodeHeight / 2 }
        return { id: `${e.parentId}->${e.childId}`, from: fromCenter, to: toCenter }
      })

      const surfaceAriaLabel = t('mindMap.aria.canvas', {}, { defaultValue: 'Mind map canvas' })
      const collapseLabel = t('mindMap.action.collapse', {}, { defaultValue: 'Collapse subtree' })
      const expandLabel = t('mindMap.action.expand', {}, { defaultValue: 'Expand subtree' })
      const addChildLabel = t('mindMap.action.addChild', {}, { defaultValue: 'Add child node' })
      const newChildText = t('mindMap.defaults.newChild', {}, { defaultValue: 'New idea' })
      const editAriaLabel = t('mindMap.aria.edit', {}, { defaultValue: 'Edit node text' })

      const nodeChildren = visibleNodes.map((node): VNodeChild | null => {
        const pos = positions.get(node.id)
        if (!pos) return null
        const hasChildren = node.children.length > 0
        // node.color drives an inset accent bar on the body (DESIGN.md →
        // "Accent bars"); the recipe's class carries the left padding.
        const accentStyle: Record<string, string> = node.color
          ? { ['--mol-accent']: node.color }
          : {}
        const bodyStyle: Record<string, string> = {
          ...accentStyle,
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          padding: node.color ? '0 8px 0 30px' : '0 8px',
        }
        const bodyChildren: VNodeChild[] = [
          editingId.value === node.id
            ? h('input', {
                ref: editInputRef,
                'aria-label': editAriaLabel,
                'data-mol-id': `mind-map-node-input-${node.id}`,
                value: editingDraft.value,
                onInput: (e: Event) => {
                  editingDraft.value = (e.currentTarget as HTMLInputElement).value
                },
                onBlur: () => {
                  commitEdit()
                },
                onKeydown: (e: KeyboardEvent) => {
                  onEditKeyDown(e)
                },
                onPointerdown: (e: PointerEvent) => {
                  e.stopPropagation()
                },
                style: {
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  font: 'inherit',
                  color: 'inherit',
                },
              })
            : h('span', { 'data-mol-id': `mind-map-node-text-${node.id}` }, [node.text]),
        ]
        if (hasChildren) {
          bodyChildren.push(
            h(
              'button',
              {
                type: 'button',
                'aria-label': node.collapsed ? expandLabel : collapseLabel,
                'aria-expanded': !node.collapsed,
                'data-mol-id': `mind-map-node-toggle-${node.id}`,
                // Icon-only node chrome: a 20px glyph inside a node card,
                // so it stays bespoke — but the corner rounding is the
                // ClassMap's, not an off-scale inline `borderRadius: 4`,
                // and the touch floor comes from the ClassMap too.
                class: cm.cn(cm.cursorPointer, cm.roundedFull, cm.touchTargetCompact),
                onPointerdown: (e: PointerEvent) => {
                  e.stopPropagation()
                },
                onClick: (e: MouseEvent) => {
                  e.stopPropagation()
                  commit(toggleCollapsed(currentRoot, node.id))
                },
                style: {
                  marginLeft: 'auto',
                  width: '20px',
                  height: '20px',
                },
              },
              [node.collapsed ? '+' : '−'],
            ),
          )
        }
        bodyChildren.push(
          h(
            'button',
            {
              type: 'button',
              'aria-label': addChildLabel,
              'data-mol-id': `mind-map-node-add-${node.id}`,
              // Same icon-only node chrome as the collapse toggle above.
              class: cm.cn(cm.cursorPointer, cm.roundedFull, cm.touchTargetCompact),
              onPointerdown: (e: PointerEvent) => {
                e.stopPropagation()
              },
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                const newId = `${node.id}-c-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                commit(
                  addChild(currentRoot, node.id, {
                    id: newId,
                    text: newChildText,
                    children: [],
                  }),
                )
              },
              style: {
                marginLeft: hasChildren ? '4px' : 'auto',
                width: '20px',
                height: '20px',
              },
            },
            ['+'],
          ),
        )
        return h(
          CanvasNode,
          {
            key: node.id,
            id: node.id,
            position: pos,
            size: { width: props.nodeWidth, height: props.nodeHeight },
            onSelect: (_id: CanvasItemId | undefined, e: PointerEvent) => {
              if (editingId.value === node.id) return
              // Fire click only if not double-clicking; the surface
              // forwards detail count via the native event when
              // available.
              if ((e.detail ?? 1) >= 2) {
                beginEdit(node, e)
                return
              }
              props.onNodeClick?.(node)
            },
          },
          () => [
            h(
              'div',
              {
                'data-mol-id': `mind-map-node-body-${node.id}`,
                class: cm.cn(
                  cm.surface,
                  cm.borderAll,
                  cm.cursorPointer,
                  node.color && cm.accentCard({ tone: 'custom' }),
                ),
                style: bodyStyle,
                onDblclick: (e: MouseEvent) => {
                  beginEdit(node, e)
                },
              },
              bodyChildren,
            ),
          ],
        )
      })

      return h(
        'div',
        {
          'data-mol-id': 'mind-map-canvas',
          'data-mind-map-layout': props.layout,
          class: cm.cn(cm.position('relative'), props.className),
        },
        [
          h(
            CanvasSurface,
            { width: props.width, height: props.height, ariaLabel: surfaceAriaLabel },
            () => [
              ...edgeEndpoints.map((e) =>
                h(CanvasEdge, { key: e.id, from: e.from, to: e.to, kind: 'bezier' }),
              ),
              ...nodeChildren,
            ],
          ),
        ],
      )
    }
  },
})
