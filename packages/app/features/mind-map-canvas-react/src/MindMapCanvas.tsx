import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useCallback, useMemo, useState } from 'react'

import {
  CanvasEdge,
  CanvasNode,
  CanvasSurface,
  type Point,
} from '@molecule/app-feature-canvas-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  computeHorizontalTreePositions,
  computeRadialPositions,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
} from './layout.js'
import { addChild, setNodeText, toggleCollapsed } from './tree.js'
import type { MindMapLayout, MindMapNode } from './types.js'

/** `<MindMapCanvas>` props. */
export interface MindMapCanvasProps {
  /**
   * Root of the mind-map tree. The canvas is fully-controlled when
   * `onChange` is supplied; otherwise the component manages its own
   * mirror via `useState`.
   */
  root: MindMapNode
  /**
   * Optional change callback. When provided, the canvas runs in
   * controlled mode — every fold/edit/add-child mutation calls
   * `onChange(nextRoot)` and the parent decides whether to commit.
   */
  onChange?: (next: MindMapNode) => void
  /** Layout strategy. Defaults to `'radial'`. */
  layout?: MindMapLayout
  /** Width of the surface in CSS pixels. Defaults to `800`. */
  width?: number
  /** Height of the surface in CSS pixels. Defaults to `600`. */
  height?: number
  /** Node width in canvas units. Defaults to {@link DEFAULT_NODE_WIDTH}. */
  nodeWidth?: number
  /** Node height in canvas units. Defaults to {@link DEFAULT_NODE_HEIGHT}. */
  nodeHeight?: number
  /** Fired when a node is clicked (single click, no drag). */
  onNodeClick?: (node: MindMapNode) => void
  /**
   * Fired when a node's text is committed via inline edit. Receives the
   * node id and the new text. Useful for analytics / autosave.
   */
  onNodeEdit?: (id: string, text: string) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

/**
 * Mind-map canvas — a thin domain wrapper over
 * `@molecule/app-feature-canvas-react`. Composes `<CanvasSurface>` for
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
 * @param props - Component props.
 * @returns The mind-map canvas element.
 * @example
 * ```tsx
 * const [root, setRoot] = useState<MindMapNode>({
 *   id: 'r', text: 'Topic', children: [
 *     { id: 'a', text: 'Idea A', children: [] },
 *     { id: 'b', text: 'Idea B', children: [] },
 *   ],
 * })
 * <MindMapCanvas root={root} onChange={setRoot} layout="radial" />
 * ```
 */
export function MindMapCanvas(props: MindMapCanvasProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    root: rootProp,
    onChange,
    layout = 'radial',
    width = 800,
    height = 600,
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
    onNodeClick,
    onNodeEdit,
    className,
  } = props

  const controlled = typeof onChange === 'function'

  const [internalRoot, setInternalRoot] = useState<MindMapNode>(rootProp)
  const root = controlled ? rootProp : internalRoot

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<string>('')

  /**
   * Push a tree mutation through either the controlled callback or the
   * internal state mirror.
   *
   * @param next - The replacement root after the mutation.
   */
  const commit = useCallback(
    (next: MindMapNode) => {
      if (controlled) {
        onChange!(next)
      } else {
        setInternalRoot(next)
      }
    },
    [controlled, onChange],
  )

  const layoutResult = useMemo(() => {
    const opts = {
      nodeWidth,
      nodeHeight,
      origin: { x: width / 2, y: height / 2 } satisfies Point,
    }
    if (layout === 'radial') return computeRadialPositions(root, opts)
    return computeHorizontalTreePositions(
      root,
      { ...opts, origin: { x: nodeWidth, y: height / 2 } },
      layout === 'vertical' ? 'vertical' : 'horizontal',
    )
  }, [root, layout, width, height, nodeWidth, nodeHeight])

  const { positions, edges, visibleNodes } = layoutResult

  /**
   * Begin an inline-edit on the given node — seeds the draft with the
   * current text and stops surface pan via `e.stopPropagation()`.
   *
   * @param node - Node to start editing.
   * @param e - The triggering pointer event.
   */
  function beginEdit(node: MindMapNode, e: ReactPointerEvent<HTMLDivElement>): void {
    e.stopPropagation()
    setEditingId(node.id)
    setEditingDraft(node.text)
  }

  /**
   * Commit the current draft to the tree (calls `onNodeEdit` after
   * `commit`) and exit edit mode.
   */
  function commitEdit(): void {
    if (editingId == null) return
    const id = editingId
    const text = editingDraft
    setEditingId(null)
    setEditingDraft('')
    commit(setNodeText(root, id, text))
    onNodeEdit?.(id, text)
  }

  /**
   * Cancel edit mode without committing.
   */
  function cancelEdit(): void {
    setEditingId(null)
    setEditingDraft('')
  }

  /**
   * Handle key events inside the inline-edit input — Enter commits,
   * Escape cancels, every other key bubbles normally.
   *
   * @param e - Keyboard event from the input.
   */
  function onEditKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  /**
   * Find a node by id from the visible-nodes set (lookup is O(1) via
   * the layout map, but we still need the node for callbacks).
   *
   * @param id - Node id.
   * @returns The node, or `undefined` if no visible node has that id.
   */
  function findVisible(id: string): MindMapNode | undefined {
    return visibleNodes.find((n) => n.id === id)
  }

  // Compute edge endpoints by reading positions; positions are top-left,
  // edges connect parent-right-center → child-left-center (horizontal),
  // and node-center → node-center (radial / vertical) so the bezier
  // looks natural in every layout.
  const edgeEndpoints = useMemo(() => {
    return edges.map((e) => {
      const p = positions.get(e.parentId)!
      const c = positions.get(e.childId)!
      const fromCenter: Point = { x: p.x + nodeWidth / 2, y: p.y + nodeHeight / 2 }
      const toCenter: Point = { x: c.x + nodeWidth / 2, y: c.y + nodeHeight / 2 }
      return { id: `${e.parentId}->${e.childId}`, from: fromCenter, to: toCenter }
    })
  }, [edges, positions, nodeWidth, nodeHeight])

  const surfaceAriaLabel = t('mindMap.aria.canvas', {}, { defaultValue: 'Mind map canvas' })
  const collapseLabel = t('mindMap.action.collapse', {}, { defaultValue: 'Collapse subtree' })
  const expandLabel = t('mindMap.action.expand', {}, { defaultValue: 'Expand subtree' })
  const addChildLabel = t('mindMap.action.addChild', {}, { defaultValue: 'Add child node' })
  const newChildText = t('mindMap.defaults.newChild', {}, { defaultValue: 'New idea' })
  const editAriaLabel = t('mindMap.aria.edit', {}, { defaultValue: 'Edit node text' })

  return (
    <div
      data-mol-id="mind-map-canvas"
      data-mind-map-layout={layout}
      className={cm.cn(cm.position('relative'), className)}
    >
      <CanvasSurface width={width} height={height} ariaLabel={surfaceAriaLabel}>
        {edgeEndpoints.map((e) => (
          <CanvasEdge key={e.id} from={e.from} to={e.to} kind="bezier" />
        ))}

        {visibleNodes.map((node) => {
          const pos = positions.get(node.id)
          if (!pos) return null
          const isEditing = editingId === node.id
          const hasChildren = node.children.length > 0
          const accentStyle: CSSProperties = node.color
            ? { borderLeft: `4px solid ${node.color}` }
            : {}
          const bodyStyle: CSSProperties = {
            ...accentStyle,
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
          }
          return (
            <CanvasNode
              key={node.id}
              id={node.id}
              position={pos}
              size={{ width: nodeWidth, height: nodeHeight }}
              onSelect={(_id, e) => {
                if (isEditing) return
                // Fire click only if not double-clicking; the surface
                // forwards detail count via the native event when
                // available.
                if ((e.detail ?? 1) >= 2) {
                  beginEdit(node, e)
                  return
                }
                onNodeClick?.(node)
              }}
            >
              <div
                data-mol-id={`mind-map-node-body-${node.id}`}
                className={cm.cn(cm.surface, cm.borderAll, cm.cursorPointer)}
                style={bodyStyle}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingId(node.id)
                  setEditingDraft(node.text)
                }}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    aria-label={editAriaLabel}
                    data-mol-id={`mind-map-node-input-${node.id}`}
                    value={editingDraft}
                    onChange={(e) => setEditingDraft(e.currentTarget.value)}
                    onBlur={commitEdit}
                    onKeyDown={onEditKeyDown}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  />
                ) : (
                  <span data-mol-id={`mind-map-node-text-${node.id}`}>{node.text}</span>
                )}

                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={node.collapsed ? expandLabel : collapseLabel}
                    aria-expanded={!node.collapsed}
                    data-mol-id={`mind-map-node-toggle-${node.id}`}
                    className={cm.cn(cm.cursorPointer)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      commit(toggleCollapsed(root, node.id))
                    }}
                    style={{
                      marginLeft: 'auto',
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                    }}
                  >
                    {node.collapsed ? '+' : '−'}
                  </button>
                ) : null}

                <button
                  type="button"
                  aria-label={addChildLabel}
                  data-mol-id={`mind-map-node-add-${node.id}`}
                  className={cm.cn(cm.cursorPointer)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    const newId = `${node.id}-c-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                    commit(
                      addChild(root, node.id, {
                        id: newId,
                        text: newChildText,
                        children: [],
                      }),
                    )
                  }}
                  style={{
                    marginLeft: hasChildren ? 4 : 'auto',
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                  }}
                >
                  +
                </button>
              </div>
            </CanvasNode>
          )
        })}
      </CanvasSurface>
    </div>
  )
}
