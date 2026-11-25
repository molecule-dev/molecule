<!--
  MindMapCanvas: the Svelte counterpart of `@molecule/app-mind-map-canvas-react`'s
  `<MindMapCanvas>` — a tree-structured mind-map canvas with radial / horizontal /
  vertical auto-layout, fold/unfold subtrees, inline edit-on-double-click and an
  add-child button. Same props (React names), same ClassMap classes, same inline
  geometry, same DOM for the same input.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { CanvasEdge, CanvasNode, CanvasSurface } from '@molecule/app-feature-canvas-svelte'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyle } from '@molecule/app-ui-svelte'

  import {
    computeHorizontalTreePositions,
    computeRadialPositions,
    DEFAULT_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
  } from './layout.js'
  import { addChild, setNodeText, toggleCollapsed } from './tree.js'
  import type { MindMapCanvasProps, MindMapLayoutResult, MindMapNode } from './types.js'
  import { reactInputValue } from './value.js'

  let {
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
  }: MindMapCanvasProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Internal mirror used in uncontrolled mode (React's `useState`): the
  // initial props are read once, at mount.
  let internalRoot = $state<MindMapNode>(untrack(() => rootProp))
  let editingId = $state<string | null>(null)
  let editingDraft = $state('')

  // Move focus into the freshly-mounted inline editor (the WAI-ARIA
  // inline-edit pattern) without `autoFocus`, which jsx-a11y forbids.
  let editInput: HTMLInputElement | undefined = $state()
  $effect(() => {
    if (editingId != null) editInput?.focus()
  })

  /** Whether `onChange` makes the canvas controlled. */
  const controlled = $derived(typeof onChange === 'function')
  /** The root the canvas renders. */
  const root = $derived(controlled ? rootProp : internalRoot)

  /** The layout of the current tree (React's `useMemo` body). */
  const layoutResult = $derived.by((): MindMapLayoutResult => {
    const opts = {
      nodeWidth,
      nodeHeight,
      origin: { x: width / 2, y: height / 2 },
    }
    if (layout === 'radial') return computeRadialPositions(root, opts)
    return computeHorizontalTreePositions(
      root,
      { ...opts, origin: { x: nodeWidth, y: height / 2 } },
      layout === 'vertical' ? 'vertical' : 'horizontal',
    )
  })
  const positions = $derived(layoutResult.positions)
  const visibleNodes = $derived(layoutResult.visibleNodes)
  // Edge endpoints connect node-center → node-center so the bezier looks
  // natural in every layout.
  const edgeEndpoints = $derived(
    layoutResult.edges.map((edge) => {
      const p = positions.get(edge.parentId)!
      const c = positions.get(edge.childId)!
      return {
        id: `${edge.parentId}->${edge.childId}`,
        from: { x: p.x + nodeWidth / 2, y: p.y + nodeHeight / 2 },
        to: { x: c.x + nodeWidth / 2, y: c.y + nodeHeight / 2 },
      }
    }),
  )

  const surfaceAriaLabel = $derived(
    t('mindMap.aria.canvas', {}, { defaultValue: 'Mind map canvas' }),
  )
  const collapseLabel = $derived(
    t('mindMap.action.collapse', {}, { defaultValue: 'Collapse subtree' }),
  )
  const expandLabel = $derived(t('mindMap.action.expand', {}, { defaultValue: 'Expand subtree' }))
  const addChildLabel = $derived(
    t('mindMap.action.addChild', {}, { defaultValue: 'Add child node' }),
  )
  const editAriaLabel = $derived(t('mindMap.aria.edit', {}, { defaultValue: 'Edit node text' }))

  /**
   * Push a tree mutation through either the controlled callback or the
   * internal state mirror.
   *
   * @param next - The replacement root after the mutation.
   */
  const commit = (next: MindMapNode): void => {
    if (controlled) onChange?.(next)
    else internalRoot = next
  }

  /**
   * Begin an inline-edit on the given node — seeds the draft with the current
   * text and stops surface pan via `event.stopPropagation()`.
   *
   * @param node - Node to start editing.
   * @param event - The triggering event.
   */
  function beginEdit(node: MindMapNode, event: Event): void {
    event.stopPropagation()
    editingId = node.id
    editingDraft = node.text
  }

  /**
   * Commit the current draft to the tree (calls `onNodeEdit` after `commit`)
   * and exit edit mode.
   */
  function commitEdit(): void {
    if (editingId == null) return
    const id = editingId
    const text = editingDraft
    editingId = null
    editingDraft = ''
    commit(setNodeText(root, id, text))
    onNodeEdit?.(id, text)
  }

  /** Cancel edit mode without committing. */
  function cancelEdit(): void {
    editingId = null
    editingDraft = ''
  }

  /**
   * Handle key events inside the inline-edit input — Enter commits, Escape
   * cancels, every other key bubbles normally.
   *
   * @param event - Keyboard event from the input.
   */
  function onEditKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }
</script>

<div
  data-mol-id="mind-map-canvas"
  data-mind-map-layout={layout}
  class={cm.cn(cm.position('relative'), className)}
>
  <CanvasSurface {width} {height} ariaLabel={surfaceAriaLabel}>
    {#each edgeEndpoints as edge (edge.id)}
      <CanvasEdge from={edge.from} to={edge.to} kind="bezier" />
    {/each}
    {#each visibleNodes as node (node.id)}
      {@const pos = positions.get(node.id)}
      {#if pos}
        <CanvasNode
          id={node.id}
          position={pos}
          size={{ width: nodeWidth, height: nodeHeight }}
          onSelect={(id, e) => {
            if (editingId === node.id) return
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
          <!-- React's body div carries no role; the dblclick handler opens the
              inline editor, which an <input> (not this div) receives focus for. -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            data-mol-id="mind-map-node-body-{node.id}"
            class={cm.cn(
              cm.surface,
              cm.borderAll,
              cm.cursorPointer,
              node.color && cm.accentCard({ tone: 'custom' }),
            )}
            style={node.color
              ? `--mol-accent: ${node.color}; width: 100%; height: 100%; box-sizing: border-box; display: flex; align-items: center; padding: 0 8px 0 30px`
              : 'width: 100%; height: 100%; box-sizing: border-box; display: flex; align-items: center; padding: 0 8px'}
            ondblclick={(event) => beginEdit(node, event)}
          >
            {#if editingId === node.id}
              <input
                bind:this={editInput}
                aria-label={editAriaLabel}
                data-mol-id="mind-map-node-input-{node.id}"
                use:reactInputValue={{ value: editingDraft }}
                oninput={(event) => {
                  editingDraft = (event.currentTarget as HTMLInputElement).value
                }}
                onblur={commitEdit}
                onkeydown={onEditKeyDown}
                onpointerdown={(event) => event.stopPropagation()}
                use:reactStyle={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  font: 'inherit',
                  color: 'inherit',
                }}
              />
            {:else}
              <span data-mol-id="mind-map-node-text-{node.id}">{node.text}</span>
            {/if}

            {#if node.children.length > 0}
              <button
                type="button"
                aria-label={node.collapsed ? expandLabel : collapseLabel}
                aria-expanded={!node.collapsed}
                data-mol-id="mind-map-node-toggle-{node.id}"
                class={cm.cn(cm.cursorPointer, cm.roundedFull, cm.touchTargetCompact)}
                onpointerdown={(event) => event.stopPropagation()}
                onclick={(event) => {
                  event.stopPropagation()
                  commit(toggleCollapsed(root, node.id))
                }}
                style="margin-left: auto; width: 20px; height: 20px"
              >
                {node.collapsed ? '+' : '−'}
              </button>
            {/if}

            <button
              type="button"
              aria-label={addChildLabel}
              data-mol-id="mind-map-node-add-{node.id}"
              class={cm.cn(cm.cursorPointer, cm.roundedFull, cm.touchTargetCompact)}
              onpointerdown={(event) => event.stopPropagation()}
              onclick={(event) => {
                event.stopPropagation()
                const newId = `${node.id}-c-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                commit(
                  addChild(root, node.id, {
                    id: newId,
                    text: t('mindMap.defaults.newChild', {}, { defaultValue: 'New idea' }),
                    children: [],
                  }),
                )
              }}
              style={node.children.length > 0
                ? 'margin-left: 4px; width: 20px; height: 20px'
                : 'margin-left: auto; width: 20px; height: 20px'}
            >
              +
            </button>
          </div>
        </CanvasNode>
      {/if}
    {/each}
  </CanvasSurface>
</div>
