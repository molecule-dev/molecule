/**
 * Vue nested comment tree: per-node collapse / expand, depth-based indentation
 * and the reply / vote slots.
 *
 * Vue counterpart of `@molecule/app-feature-thread-tree-react`'s `ThreadTree` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys,
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { Comment, ThreadTreeProps } from './types.js'

/** Depth at which nodes start collapsed when the caller passes none. */
const DEFAULT_COLLAPSED_DEPTH = 4

/**
 * Indent step (rem) applied per depth level. Authored once here so the rest of
 * the component reads `INDENT_REM_PER_DEPTH * depth` and a future design tweak
 * only edits one constant.
 */
const INDENT_REM_PER_DEPTH = 1

/** Deepest level that still adds indentation. */
const MAX_INDENT_DEPTH = 8

/**
 * Compute a flat set of node ids that should start collapsed based on the
 * configured `defaultCollapsedDepth`. Walks the tree once, so the caller only
 * pays the traversal cost during the initial render.
 *
 * @param comments - Top-level comments.
 * @param threshold - Depth at which nodes are auto-collapsed.
 * @returns A `Set` of comment ids that should start collapsed.
 */
function computeInitialCollapsed(comments: Comment[], threshold: number): Set<string> {
  const collapsed = new Set<string>()
  const visit = (nodes: Comment[], depth: number): void => {
    for (const node of nodes) {
      if (depth >= threshold && node.children && node.children.length > 0) collapsed.add(node.id)
      if (node.children && node.children.length > 0) visit(node.children, depth + 1)
    }
  }
  visit(comments, 0)
  return collapsed
}

/**
 * Count the total number of descendant comments in a sub-tree (recursively).
 * Used to render the "N replies hidden" affordance on collapsed nodes so the
 * viewer knows the volume behind the toggle.
 *
 * @param children - Direct children of the collapsed node.
 * @returns Total descendant count.
 */
function countDescendants(children: Comment[] | undefined): number {
  if (!children || children.length === 0) return 0
  let total = 0
  for (const child of children) total += 1 + countDescendants(child.children)
  return total
}

/**
 * Children for a `h()` call from a node-valued field: an array stays a child
 * list, a single node is wrapped, and an absent value contributes nothing.
 *
 * @param value - The node-valued field.
 * @returns The children array.
 */
function childrenOf(value: VNodeChild | undefined): VNodeChild[] {
  if (Array.isArray(value)) return value as VNodeChild[]
  return value === undefined || value === null || value === false ? [] : [value as VNodeChild]
}

/**
 * Recursive node renderer: one comment plus its (possibly collapsed) children.
 *
 * @param props - Node props (see the component definition).
 * @returns The rendered node element.
 */
const ThreadTreeNode = defineComponent({
  name: 'ThreadTreeNode',
  props: {
    comment: { type: Object as PropType<Comment>, required: true },
    depth: { type: Number, required: true },
    collapsedIds: { type: Object as PropType<Set<string>>, required: true },
    onToggleCollapse: {
      type: Function as PropType<(commentId: string) => void>,
      required: true,
    },
    onReply: { type: Function as PropType<ThreadTreeProps['onReply']> },
    onUpvote: { type: Function as PropType<ThreadTreeProps['onUpvote']> },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // The replies list's id, wired to the toggle's `aria-controls` — Vue's
    // `useId()`, the counterpart of React's hook. Generated per rendered node,
    // never derived from the comment's data.
    const repliesId = useId()

    return (): VNode => {
      const comment = props.comment
      const hasChildren = !!(comment.children && comment.children.length > 0)
      const collapsed = props.collapsedIds.has(comment.id)
      const hiddenCount = collapsed ? countDescendants(comment.children) : 0
      const clampedDepth = Math.min(props.depth, MAX_INDENT_DEPTH)
      const indentRem = clampedDepth * INDENT_REM_PER_DEPTH
      // Plain text is a paragraph. Rich children may already contain block
      // elements, so preserve their container rather than nesting paragraphs.
      const plainText = typeof comment.body === 'string'
      const bodyTag = plainText ? 'p' : 'div'

      const toggle = h(
        'button',
        {
          type: 'button',
          onClick: (): void => props.onToggleCollapse(comment.id),
          'data-mol-id': `thread-tree-toggle-${comment.id}`,
          'aria-expanded': collapsed ? 'false' : 'true',
          // While collapsed the replies list is not rendered, so the reference
          // is dropped with it (and a comment without children has no list).
          'aria-controls': hasChildren && !collapsed ? repliesId : undefined,
          'aria-label': collapsed
            ? t(
                'threadTree.expand',
                { count: hiddenCount },
                { defaultValue: 'Expand {{count}} replies' },
              )
            : t('threadTree.collapse', {}, { defaultValue: 'Collapse thread' }),
          class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer),
        },
        collapsed
          ? t('threadTree.expandSymbol', {}, { defaultValue: '[+]' })
          : t('threadTree.collapseSymbol', {}, { defaultValue: '[−]' }),
      )

      const header = h('header', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
        toggle,
        h(
          'span',
          { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
          childrenOf(comment.author),
        ),
        typeof comment.score === 'number'
          ? h(
              'span',
              { class: cm.cn(cm.textSize('xs'), cm.textMuted) },
              t('threadTree.score', { count: comment.score }, { defaultValue: '{{count}} points' }),
            )
          : null,
        comment.createdAt
          ? h(
              'time',
              { dateTime: comment.createdAt, class: cm.cn(cm.textSize('xs'), cm.textMuted) },
              comment.createdAt,
            )
          : null,
        collapsed && hiddenCount > 0
          ? h(
              'span',
              { class: cm.cn(cm.textSize('xs'), cm.textMuted) },
              t(
                'threadTree.hiddenReplies',
                { count: hiddenCount },
                { defaultValue: '{{count}} hidden' },
              ),
            )
          : null,
      ])

      const body = h(
        bodyTag,
        {
          class: cm.cn(cm.textSize('sm'), cm.sp('m', 0)),
          style: plainText ? { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } : undefined,
        },
        childrenOf(comment.body),
      )

      const actions = h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
        props.onUpvote
          ? h(
              'button',
              {
                type: 'button',
                onClick: (): void => props.onUpvote?.(comment.id, !comment.upvoted),
                'data-mol-id': `thread-tree-upvote-${comment.id}`,
                'aria-pressed': comment.upvoted ? 'true' : 'false',
                'aria-label': t('threadTree.upvote', {}, { defaultValue: 'Upvote' }),
                class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer),
              },
              t('threadTree.upvote', {}, { defaultValue: 'Upvote' }),
            )
          : null,
        props.onReply
          ? h(
              'button',
              {
                type: 'button',
                onClick: (): void => props.onReply?.(comment.id),
                'data-mol-id': `thread-tree-reply-${comment.id}`,
                'aria-label': t('threadTree.reply', {}, { defaultValue: 'Reply' }),
                class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer),
              },
              t('threadTree.reply', {}, { defaultValue: 'Reply' }),
            )
          : null,
      ])

      const article = h(
        'article',
        {
          class: cm.cn(cm.stack(1 as const), cm.sp('py', 2)),
          style:
            props.depth > 0
              ? {
                  borderLeft: '2px solid currentColor',
                  paddingLeft: '0.5rem',
                  opacity: 0.95,
                }
              : undefined,
        },
        collapsed ? [header] : [header, body, actions],
      )

      // A comment thread is nested lists, not an ARIA tree widget: plain
      // `ul`/`li` semantics (with the toggle's `aria-expanded` +
      // `aria-controls` carrying the state), so every `li` keeps its
      // `listitem` role and no tree keyboard model is implied.
      const childList =
        hasChildren && !collapsed
          ? h(
              'ul',
              { id: repliesId, class: cm.cn(cm.stack(1 as const)) },
              comment.children!.map((child) =>
                h(ThreadTreeNode, {
                  key: child.id,
                  comment: child,
                  depth: props.depth + 1,
                  collapsedIds: props.collapsedIds,
                  onToggleCollapse: props.onToggleCollapse,
                  onReply: props.onReply,
                  onUpvote: props.onUpvote,
                }),
              ),
            )
          : null

      return h(
        'li',
        {
          class: cm.cn(cm.stack(1 as const)),
          'data-mol-id': `thread-tree-comment-${comment.id}`,
          'data-thread-depth': props.depth,
          style: { paddingLeft: `${indentRem}rem` },
        },
        [article, childList],
      )
    }
  },
})

/**
 * Recursive nested-comment tree with per-node collapse / expand, depth-based
 * indentation, and reply / upvote slots. Apps own the data; the component
 * handles rendering, collapse state, and event dispatch.
 *
 * All UI text resolves through `t()` so apps localise via the companion
 * `@molecule/app-locales-feature-thread-tree` package. All styling resolves
 * through `getClassMap()` — no Tailwind utilities live here.
 *
 * @param props - Component props (see {@link ThreadTreeProps}).
 * @returns The tree component.
 */
export const ThreadTree = defineComponent({
  name: 'ThreadTree',
  props: {
    comments: { type: Array as PropType<Comment[]>, required: true },
    onReply: { type: Function as PropType<ThreadTreeProps['onReply']> },
    onUpvote: { type: Function as PropType<ThreadTreeProps['onUpvote']> },
    onCollapse: { type: Function as PropType<ThreadTreeProps['onCollapse']> },
    defaultCollapsedDepth: { type: Number, default: DEFAULT_COLLAPSED_DEPTH },
    className: String,
    dataMolId: String,
  },
  setup(props) {
    const cm = getClassMap()
    // React's `useState(() => computeInitialCollapsed(...))`: read once from the
    // first render's props, then owned by the component.
    const collapsedIds = ref<Set<string>>(
      computeInitialCollapsed(props.comments, props.defaultCollapsedDepth),
    )

    /**
     * Flips one node's collapsed state and reports the new state, as React's
     * `onToggleCollapse` does.
     *
     * @param commentId - The node to toggle.
     */
    const toggleCollapse = (commentId: string): void => {
      const wasCollapsed = collapsedIds.value.has(commentId)
      const next = new Set(collapsedIds.value)
      if (wasCollapsed) next.delete(commentId)
      else next.add(commentId)
      collapsedIds.value = next
      props.onCollapse?.(commentId, !wasCollapsed)
    }

    return (): VNode =>
      h(
        'ul',
        {
          class: cm.cn(cm.stack(2 as const), props.className),
          'data-mol-id': props.dataMolId ?? 'thread-tree',
        },
        props.comments.map((comment) =>
          h(ThreadTreeNode, {
            key: comment.id,
            comment,
            depth: 0,
            collapsedIds: collapsedIds.value,
            onToggleCollapse: toggleCollapse,
            onReply: props.onReply,
            onUpvote: props.onUpvote,
          }),
        ),
      )
  },
})
