/**
 * Solid mind-map canvas: the Solid counterpart of
 * `@molecule/app-mind-map-canvas-react`'s `<MindMapCanvas>` — the same props
 * (React names), the same ClassMap classes, the same inline geometry and the
 * same DOM for the same input.
 *
 * @module
 */

import { type Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'

import {
  CanvasEdge,
  type CanvasItemId,
  CanvasNode,
  CanvasSurface,
  type Point,
} from '@molecule/app-feature-canvas-solid'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import {
  computeHorizontalTreePositions,
  computeRadialPositions,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
} from './layout.js'
import { addChild, setNodeText, toggleCollapsed } from './tree.js'
import type { MindMapCanvasProps, MindMapLayoutResult, MindMapNode } from './types.js'

// The inline editor's input style — the bare field reset. As an object it
// applies per property (`setProperty`), exactly as React's inline styles are
// applied: a raw `cssText` write drops `background: transparent` in jsdom's
// combined-shorthand parse, so the string form does not match React's DOM.
/** The inline editor's input style — the bare field reset. */
const editInputStyle = (): Record<string, string> => ({
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  font: 'inherit',
  color: 'inherit',
})

/**
 * Mind-map canvas — a thin domain wrapper over
 * `@molecule/app-feature-canvas-solid`. Composes `<CanvasSurface>` for
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
 * @returns The mind-map canvas element.
 */
export const MindMapCanvas: Component<MindMapCanvasProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Internal mirror used in uncontrolled mode (React's `useState`): the
  // initial props are read once, at mount.
  const [internalRoot, setInternalRoot] = createSignal<MindMapNode>(props.root)
  const [editingId, setEditingId] = createSignal<string | null>(null)
  const [editingDraft, setEditingDraft] = createSignal('')

  // Move focus into the freshly-mounted inline editor (the WAI-ARIA
  // inline-edit pattern) without `autoFocus`, which jsx-a11y forbids.
  let editInputRef: HTMLInputElement | undefined
  createEffect(() => {
    if (editingId() != null) editInputRef?.focus()
  })

  /** Whether `onChange` makes the canvas controlled. */
  const controlled = (): boolean => typeof props.onChange === 'function'
  /** The root the canvas renders. */
  const root = (): MindMapNode => (controlled() ? props.root : internalRoot())

  /**
   * Push a tree mutation through either the controlled callback or the
   * internal state mirror.
   *
   * @param next - The replacement root after the mutation.
   */
  const commit = (next: MindMapNode): void => {
    if (controlled()) props.onChange?.(next)
    else setInternalRoot(next)
  }

  /** The layout props with React's destructuring defaults applied. */
  const dims = createMemo(() => ({
    layout: props.layout ?? 'radial',
    width: props.width ?? 800,
    height: props.height ?? 600,
    nodeWidth: props.nodeWidth ?? DEFAULT_NODE_WIDTH,
    nodeHeight: props.nodeHeight ?? DEFAULT_NODE_HEIGHT,
  }))

  /** The layout of the current tree (React's `useMemo` body). */
  const layout = createMemo((): MindMapLayoutResult => {
    const { width, height, nodeWidth, nodeHeight, layout: kind } = dims()
    const opts = {
      nodeWidth,
      nodeHeight,
      origin: { x: width / 2, y: height / 2 } satisfies Point,
    }
    if (kind === 'radial') return computeRadialPositions(root(), opts)
    return computeHorizontalTreePositions(
      root(),
      { ...opts, origin: { x: nodeWidth, y: height / 2 } },
      kind === 'vertical' ? 'vertical' : 'horizontal',
    )
  })

  /**
   * Begin an inline-edit on the given node — seeds the draft with the
   * current text and stops surface pan via `e.stopPropagation()`.
   *
   * @param node - Node to start editing.
   * @param e - The triggering event.
   */
  const beginEdit = (node: MindMapNode, e: Event): void => {
    e.stopPropagation()
    setEditingId(node.id)
    setEditingDraft(node.text)
  }

  /**
   * Commit the current draft to the tree (calls `onNodeEdit` after
   * `commit`) and exit edit mode.
   */
  const commitEdit = (): void => {
    if (editingId() == null) return
    const id = editingId()!
    const text = editingDraft()
    setEditingId(null)
    setEditingDraft('')
    commit(setNodeText(root(), id, text))
    props.onNodeEdit?.(id, text)
  }

  /** Cancel edit mode without committing. */
  const cancelEdit = (): void => {
    setEditingId(null)
    setEditingDraft('')
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

  /** The canvas-space box of every node (React's `size` prop). */
  const nodeSize = (): { width: number; height: number } => ({
    width: dims().nodeWidth,
    height: dims().nodeHeight,
  })

  return (
    <div
      data-mol-id="mind-map-canvas"
      data-mind-map-layout={dims().layout}
      class={cm.cn(cm.position('relative'), props.className)}
    >
      <CanvasSurface
        width={dims().width}
        height={dims().height}
        ariaLabel={t('mindMap.aria.canvas', {}, { defaultValue: 'Mind map canvas' })}
      >
        {/* Compute edge endpoints by reading positions; edges connect
            node-center → node-center so the bezier looks natural in every
            layout. */}
        {layout()
          .edges.map((e) => {
            const p = layout().positions.get(e.parentId)!
            const c = layout().positions.get(e.childId)!
            const fromCenter: Point = {
              x: p.x + dims().nodeWidth / 2,
              y: p.y + dims().nodeHeight / 2,
            }
            const toCenter: Point = {
              x: c.x + dims().nodeWidth / 2,
              y: c.y + dims().nodeHeight / 2,
            }
            return { id: `${e.parentId}->${e.childId}`, from: fromCenter, to: toCenter }
          })
          .map((e) => (
            <CanvasEdge from={e.from} to={e.to} kind="bezier" />
          ))}

        <For each={layout().visibleNodes}>
          {(node) => {
            const pos = (): Point | undefined => layout().positions.get(node.id)
            const hasChildren = (): boolean => node.children.length > 0
            // node.color drives an inset accent bar on the body (DESIGN.md →
            // "Accent bars"); the recipe's class carries the left padding.
            const bodyStyle = (): Record<string, string> => ({
              ...(node.color ? { '--mol-accent': node.color } : {}),
              width: '100%',
              height: '100%',
              'box-sizing': 'border-box',
              display: 'flex',
              'align-items': 'center',
              padding: node.color ? '0 8px 0 30px' : '0 8px',
            })
            return (
              <Show when={pos()}>
                {(p) => (
                  <CanvasNode
                    id={node.id}
                    position={p()}
                    size={nodeSize()}
                    onSelect={(_id: CanvasItemId | undefined, e: PointerEvent) => {
                      if (editingId() === node.id) return
                      // Fire click only if not double-clicking; the surface
                      // forwards detail count via the native event when
                      // available.
                      if ((e.detail ?? 1) >= 2) {
                        beginEdit(node, e)
                        return
                      }
                      props.onNodeClick?.(node)
                    }}
                  >
                    <div
                      data-mol-id={`mind-map-node-body-${node.id}`}
                      class={cm.cn(
                        cm.surface,
                        cm.borderAll,
                        cm.cursorPointer,
                        node.color && cm.accentCard({ tone: 'custom' }),
                      )}
                      style={bodyStyle()}
                      onDblClick={(e: MouseEvent) => {
                        e.stopPropagation()
                        setEditingId(node.id)
                        setEditingDraft(node.text)
                      }}
                    >
                      <Show
                        when={editingId() === node.id}
                        fallback={
                          <span data-mol-id={`mind-map-node-text-${node.id}`}>{node.text}</span>
                        }
                      >
                        {/* React renders the draft as the input's value
                            attribute as well as its property, and a dirty
                            input's property does not follow the attribute —
                            the attribute is what keeps the DOM equal. */}
                        <input
                          ref={(el) => {
                            editInputRef = el
                          }}
                          aria-label={t(
                            'mindMap.aria.edit',
                            {},
                            { defaultValue: 'Edit node text' },
                          )}
                          data-mol-id={`mind-map-node-input-${node.id}`}
                          attr:value={editingDraft()}
                          onInput={(e) => setEditingDraft(e.currentTarget.value)}
                          onBlur={() => commitEdit()}
                          onKeyDown={(e) => onEditKeyDown(e)}
                          onPointerDown={(e) => e.stopPropagation()}
                          style={editInputStyle()}
                        />
                      </Show>

                      <Show when={hasChildren()}>
                        <button
                          type="button"
                          aria-label={
                            node.collapsed
                              ? t('mindMap.action.expand', {}, { defaultValue: 'Expand subtree' })
                              : t(
                                  'mindMap.action.collapse',
                                  {},
                                  { defaultValue: 'Collapse subtree' },
                                )
                          }
                          aria-expanded={!node.collapsed}
                          data-mol-id={`mind-map-node-toggle-${node.id}`}
                          // Icon-only node chrome: a 20px glyph inside a node card,
                          // so it stays bespoke — but the corner rounding is the
                          // ClassMap's, not an off-scale inline `borderRadius: 4`,
                          // and the touch floor comes from the ClassMap too.
                          class={cm.cn(cm.cursorPointer, cm.roundedFull, cm.touchTargetCompact)}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            commit(toggleCollapsed(root(), node.id))
                          }}
                          style="margin-left: auto; width: 20px; height: 20px"
                        >
                          {node.collapsed ? '+' : '−'}
                        </button>
                      </Show>

                      <button
                        type="button"
                        aria-label={t(
                          'mindMap.action.addChild',
                          {},
                          { defaultValue: 'Add child node' },
                        )}
                        data-mol-id={`mind-map-node-add-${node.id}`}
                        // Same icon-only node chrome as the collapse toggle above.
                        class={cm.cn(cm.cursorPointer, cm.roundedFull, cm.touchTargetCompact)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          const newId = `${node.id}-c-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                          commit(
                            addChild(root(), node.id, {
                              id: newId,
                              text: t(
                                'mindMap.defaults.newChild',
                                {},
                                { defaultValue: 'New idea' },
                              ),
                              children: [],
                            }),
                          )
                        }}
                        style={`margin-left: ${hasChildren() ? '4px' : 'auto'}; width: 20px; height: 20px`}
                      >
                        +
                      </button>
                    </div>
                  </CanvasNode>
                )}
              </Show>
            )
          }}
        </For>
      </CanvasSurface>
    </div>
  )
}
