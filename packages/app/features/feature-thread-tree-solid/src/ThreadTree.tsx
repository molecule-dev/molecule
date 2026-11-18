/**
 * Solid nested comment tree: per-node collapse / expand, depth-based
 * indentation and the reply / vote slots.
 *
 * Solid counterpart of `@molecule/app-feature-thread-tree-react`'s `ThreadTree`
 * — the same props (React names), the same ClassMap tokens, the same i18n keys,
 * and the same DOM for the same input.
 *
 * @module
 */

import { type Component, createSignal, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { Comment, ThreadTreeProps } from './types.js'

/**
 * Next value of the module-wide replies-list id counter.
 *
 * React derives each replies-list id from `useId()`, which numbers ids from
 * one process-wide counter (`_r_<base32>_`). The id appears in the
 * `aria-controls` attribute and the replies `<ul>`'s `id`, which the
 * conformance normalizer renumbers in order of appearance, so the port
 * generates ids from the same kind of counter — unique per node instance,
 * exactly React's format.
 */
let nextRepliesId = 0

/**
 * A fresh replies-list id, in React `useId()`'s `_r_<base32>_` shape.
 *
 * @returns The id for one rendered node's replies list.
 */
const repliesId = (): string => `_r_${(nextRepliesId++).toString(32)}_`

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

/** Props accepted by the internal {@link ThreadTreeNode}. */
interface ThreadTreeNodeProps {
  /** The comment the node renders. */
  comment: Comment
  /** The node's depth in the tree (`0` at the top level). */
  depth: number
  /** The ids currently collapsed. */
  collapsedIds: Set<string>
  /** Flips one node's collapsed state. */
  onToggleCollapse: (commentId: string) => void
  /** Reply-button handler. */
  onReply?: ThreadTreeProps['onReply']
  /** Upvote-button handler. */
  onUpvote?: ThreadTreeProps['onUpvote']
}

/**
 * Recursive node renderer: one comment plus its (possibly collapsed) children.
 *
 * @param props - Node props (see {@link ThreadTreeNodeProps}).
 * @returns The rendered node element.
 */
const ThreadTreeNode: Component<ThreadTreeNodeProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** Whether the node has children to show behind the toggle. */
  const hasChildren = (): boolean => !!(props.comment.children && props.comment.children.length > 0)
  /** Whether the node is collapsed right now. */
  const collapsed = (): boolean => props.collapsedIds.has(props.comment.id)
  /** Descendants hidden behind a collapsed node (0 while expanded). */
  const hiddenCount = (): number => (collapsed() ? countDescendants(props.comment.children) : 0)
  /** The depth the indentation uses (clamped at the deepest indent step). */
  const clampedDepth = (): number => Math.min(props.depth, MAX_INDENT_DEPTH)
  /** The indent in rem. */
  const indentRem = (): number => clampedDepth() * INDENT_REM_PER_DEPTH
  // Plain text is a paragraph. Rich children may already contain block
  // elements, so preserve their container rather than nesting paragraphs.
  const plainText = (): boolean => typeof props.comment.body === 'string'

  // The replies list's id, wired to the toggle's `aria-controls`. Taken once
  // per node instance (Solid runs the component body once), never derived
  // from the comment's data.
  const thisRepliesId = repliesId()

  return (
    <li
      class={cm.cn(cm.stack(1 as const))}
      data-mol-id={`thread-tree-comment-${props.comment.id}`}
      data-thread-depth={props.depth}
      style={{ 'padding-left': `${indentRem()}rem` }}
    >
      <article
        class={cm.cn(cm.stack(1 as const), cm.sp('py', 2))}
        style={
          props.depth > 0
            ? {
                'border-left': '2px solid currentColor',
                'padding-left': '0.5rem',
                opacity: 0.95,
              }
            : undefined
        }
      >
        <header class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <button
            type="button"
            onClick={(): void => props.onToggleCollapse(props.comment.id)}
            data-mol-id={`thread-tree-toggle-${props.comment.id}`}
            aria-expanded={collapsed() ? 'false' : 'true'}
            aria-controls={hasChildren() && !collapsed() ? thisRepliesId : undefined}
            aria-label={
              collapsed()
                ? t(
                    'threadTree.expand',
                    { count: hiddenCount() },
                    { defaultValue: 'Expand {{count}} replies' },
                  )
                : t('threadTree.collapse', {}, { defaultValue: 'Collapse thread' })
            }
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
          >
            {collapsed()
              ? t('threadTree.expandSymbol', {}, { defaultValue: '[+]' })
              : t('threadTree.collapseSymbol', {}, { defaultValue: '[−]' })}
          </button>
          <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {props.comment.author}
          </span>
          <Show when={typeof props.comment.score === 'number'}>
            <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'threadTree.score',
                { count: props.comment.score ?? 0 },
                { defaultValue: '{{count}} points' },
              )}
            </span>
          </Show>
          <Show when={props.comment.createdAt}>
            {(createdAt) => (
              <time dateTime={createdAt()} class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                {createdAt()}
              </time>
            )}
          </Show>
          <Show when={collapsed() && hiddenCount() > 0}>
            <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'threadTree.hiddenReplies',
                { count: hiddenCount() },
                { defaultValue: '{{count}} hidden' },
              )}
            </span>
          </Show>
        </header>
        <Show when={!collapsed()}>
          <Show
            when={plainText()}
            fallback={
              <div class={cm.cn(cm.textSize('sm'), cm.sp('m', 0))}>{props.comment.body}</div>
            }
          >
            <p
              class={cm.cn(cm.textSize('sm'), cm.sp('m', 0))}
              style={{ 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }}
            >
              {props.comment.body}
            </p>
          </Show>
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            <Show when={props.onUpvote}>
              <button
                type="button"
                onClick={(): void => props.onUpvote?.(props.comment.id, !props.comment.upvoted)}
                data-mol-id={`thread-tree-upvote-${props.comment.id}`}
                aria-pressed={props.comment.upvoted ? 'true' : 'false'}
                aria-label={t('threadTree.upvote', {}, { defaultValue: 'Upvote' })}
                class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
              >
                {t('threadTree.upvote', {}, { defaultValue: 'Upvote' })}
              </button>
            </Show>
            <Show when={props.onReply}>
              <button
                type="button"
                onClick={(): void => props.onReply?.(props.comment.id)}
                data-mol-id={`thread-tree-reply-${props.comment.id}`}
                aria-label={t('threadTree.reply', {}, { defaultValue: 'Reply' })}
                class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
              >
                {t('threadTree.reply', {}, { defaultValue: 'Reply' })}
              </button>
            </Show>
          </div>
        </Show>
      </article>
      {/* A comment thread is nested lists, not an ARIA tree widget: plain
          `ul`/`li` semantics (with the toggle's `aria-expanded` +
          `aria-controls` carrying the state), so every `li` keeps its
          `listitem` role and no tree keyboard model is implied. */}
      <Show when={hasChildren() && !collapsed()}>
        <ul id={thisRepliesId} class={cm.cn(cm.stack(1 as const))}>
          <For each={props.comment.children}>
            {(child) => (
              <ThreadTreeNode
                comment={child}
                depth={props.depth + 1}
                collapsedIds={props.collapsedIds}
                onToggleCollapse={props.onToggleCollapse}
                onReply={props.onReply}
                onUpvote={props.onUpvote}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  )
}

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
 * @returns The rendered tree element.
 */
export const ThreadTree: Component<ThreadTreeProps> = (props) => {
  const cm = getClassMap()
  // React's `useState(() => computeInitialCollapsed(...))`: read once from the
  // first render's props, then owned by the component.
  const [collapsedIds, setCollapsedIds] = createSignal<Set<string>>(
    computeInitialCollapsed(props.comments, props.defaultCollapsedDepth ?? DEFAULT_COLLAPSED_DEPTH),
  )

  /**
   * Flips one node's collapsed state and reports the new state, as React's
   * `onToggleCollapse` does.
   *
   * @param commentId - The node to toggle.
   */
  const toggleCollapse = (commentId: string): void => {
    const wasCollapsed = collapsedIds().has(commentId)
    const next = new Set(collapsedIds())
    if (wasCollapsed) next.delete(commentId)
    else next.add(commentId)
    setCollapsedIds(next)
    props.onCollapse?.(commentId, !wasCollapsed)
  }

  return (
    <ul
      class={cm.cn(cm.stack(2 as const), props.className)}
      data-mol-id={props.dataMolId ?? 'thread-tree'}
    >
      <For each={props.comments}>
        {(comment) => (
          <ThreadTreeNode
            comment={comment}
            depth={0}
            collapsedIds={collapsedIds()}
            onToggleCollapse={toggleCollapse}
            onReply={props.onReply}
            onUpvote={props.onUpvote}
          />
        )}
      </For>
    </ul>
  )
}
