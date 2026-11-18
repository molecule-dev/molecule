<!--
  ThreadTree: the Svelte counterpart of
  `@molecule/app-feature-thread-tree-react`'s `ThreadTree` — recursive nested
  comment tree with per-node collapse / expand, depth-based indentation, and
  reply / upvote slots. Same props (React names), same DOM for the same input.

  Collapse state is read once from the first render's props (React's
  `useState` initializer), then owned by the component.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'

  import { getClassMap } from '@molecule/app-ui'

  import ThreadTreeNode from './ThreadTreeNode.svelte'
  import type { Comment, ThreadTreeProps } from './types.js'

  /** Depth at which nodes start collapsed when the caller passes none. */
  const DEFAULT_COLLAPSED_DEPTH = 4

  let {
    comments,
    onReply,
    onUpvote,
    onCollapse,
    defaultCollapsedDepth = DEFAULT_COLLAPSED_DEPTH,
    className,
    dataMolId,
  }: ThreadTreeProps = $props()

  const cm = $derived(getClassMap())

  /**
   * Compute the ids of nodes that should start collapsed based on the
   * configured `defaultCollapsedDepth`. Walks the tree once.
   *
   * @param nodes - Top-level comments.
   * @param threshold - Depth at which nodes are auto-collapsed.
   * @returns The comment ids that should start collapsed.
   */
  function computeInitialCollapsed(nodes: Comment[], threshold: number): string[] {
    const collapsed: string[] = []
    const visit = (list: Comment[], depth: number): void => {
      for (const node of list) {
        if (depth >= threshold && node.children && node.children.length > 0) collapsed.push(node.id)
        if (node.children && node.children.length > 0) visit(node.children, depth + 1)
      }
    }
    visit(nodes, 0)
    return collapsed
  }

  // React's `useState(() => computeInitialCollapsed(...))`: read once from the
  // first render's props, then owned by the component. A SvelteSet is a Set
  // whose reads and writes are reactive, so a toggle re-renders the nodes.
  const collapsedIds = new SvelteSet<string>(
    untrack(() => computeInitialCollapsed(comments, defaultCollapsedDepth)),
  )

  /**
   * Flips one node's collapsed state and reports the new state, as React's
   * `onToggleCollapse` does.
   *
   * @param commentId - The node to toggle.
   */
  function toggleCollapse(commentId: string): void {
    const wasCollapsed = collapsedIds.has(commentId)
    if (wasCollapsed) collapsedIds.delete(commentId)
    else collapsedIds.add(commentId)
    onCollapse?.(commentId, !wasCollapsed)
  }
</script>

<ul class={cm.cn(cm.stack(2), className)} data-mol-id={dataMolId ?? 'thread-tree'}>
  {#each comments as comment (comment.id)}
    <ThreadTreeNode
      {comment}
      depth={0}
      {collapsedIds}
      onToggleCollapse={toggleCollapse}
      {onReply}
      {onUpvote}
    />
  {/each}
</ul>
