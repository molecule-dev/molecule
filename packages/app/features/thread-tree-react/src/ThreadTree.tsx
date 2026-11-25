import type React from 'react'
import { useCallback, useId, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

import type { Comment, ThreadTreeProps } from './types.js'

const DEFAULT_COLLAPSED_DEPTH = 4

/**
 * Indent step (rem) applied per depth level. Authored once here so the
 * rest of the component reads `INDENT_REM_PER_DEPTH * depth` and a future
 * design tweak only edits one constant.
 */
const INDENT_REM_PER_DEPTH = 1
const MAX_INDENT_DEPTH = 8

/**
 * Compute a flat set of node ids that should start collapsed based on
 * the configured `defaultCollapsedDepth`. Walks the tree once, so the
 * caller only pays the traversal cost during the initial render.
 *
 * @param comments - Top-level comments.
 * @param threshold - Depth at which nodes are auto-collapsed.
 * @returns A `Set` of comment ids that should start collapsed.
 */
function computeInitialCollapsed(comments: Comment[], threshold: number): Set<string> {
  const collapsed = new Set<string>()
  const visit = (nodes: Comment[], depth: number): void => {
    for (const n of nodes) {
      if (depth >= threshold && n.children && n.children.length > 0) {
        collapsed.add(n.id)
      }
      if (n.children && n.children.length > 0) visit(n.children, depth + 1)
    }
  }
  visit(comments, 0)
  return collapsed
}

/**
 * Count the total number of descendant comments in a sub-tree
 * (recursively). Used to render the "N replies hidden" affordance on
 * collapsed nodes so the viewer knows the volume behind the toggle.
 *
 * @param children - Direct children of the collapsed node.
 * @returns Total descendant count.
 */
function countDescendants(children: Comment[] | undefined): number {
  if (!children || children.length === 0) return 0
  let total = 0
  for (const c of children) {
    total += 1 + countDescendants(c.children)
  }
  return total
}

interface ThreadTreeNodeProps {
  comment: Comment
  depth: number
  collapsedIds: Set<string>
  onToggleCollapse: (commentId: string) => void
  onReply?: ThreadTreeProps['onReply']
  onUpvote?: ThreadTreeProps['onUpvote']
}

/**
 * Recursive node renderer. Renders one comment plus its (possibly
 * collapsed) children. Indentation is depth-based and applied via the
 * `cm.sp` style helper so swapping ClassMap bonds (Tailwind → Bootstrap)
 * does not change spacing semantics.
 *
 * @param props - Node props.
 * @returns The rendered node element.
 */
function ThreadTreeNode({
  comment,
  depth,
  collapsedIds,
  onToggleCollapse,
  onReply,
  onUpvote,
}: ThreadTreeNodeProps): React.ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  // The replies list's id, wired to the toggle's `aria-controls`. Generated
  // per rendered node (`useId()`), never derived from the comment's data.
  const repliesId = useId()

  const hasChildren = !!(comment.children && comment.children.length > 0)
  const collapsed = collapsedIds.has(comment.id)
  const hiddenCount = collapsed ? countDescendants(comment.children) : 0

  const onToggle = useCallback((): void => {
    onToggleCollapse(comment.id)
  }, [comment.id, onToggleCollapse])

  const onReplyClick = useCallback((): void => {
    onReply?.(comment.id)
  }, [comment.id, onReply])

  const onUpvoteClick = useCallback((): void => {
    onUpvote?.(comment.id, !comment.upvoted)
  }, [comment.id, comment.upvoted, onUpvote])

  const clampedDepth = Math.min(depth, MAX_INDENT_DEPTH)
  const indentRem = clampedDepth * INDENT_REM_PER_DEPTH
  // Plain text is a paragraph. Rich children may already contain block elements,
  // so preserve their container rather than creating invalid nested paragraphs.
  const plainText = typeof comment.body === 'string'
  const bodyClasses = cm.cn(cm.textSize('sm'), cm.sp('m', 0))

  return (
    <Box
      as="li"
      className={cm.cn(cm.stack(1 as const))}
      data-mol-id={`thread-tree-comment-${comment.id}`}
      data-thread-depth={depth}
      webStyle={{ paddingLeft: `${indentRem}rem` }}
    >
      <Box
        as="article"
        className={cm.cn(cm.stack(1 as const), cm.sp('py', 2))}
        style={depth > 0 ? { opacity: 0.95 } : undefined}
        webStyle={
          depth > 0 ? { borderLeft: '2px solid currentColor', paddingLeft: '0.5rem' } : undefined
        }
      >
        <Box as="header" className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <Pressable
            as="button"
            type="button"
            onClick={onToggle}
            data-mol-id={`thread-tree-toggle-${comment.id}`}
            aria-expanded={!collapsed}
            aria-controls={hasChildren && !collapsed ? repliesId : undefined}
            aria-label={
              collapsed
                ? t(
                    'threadTree.expand',
                    { count: hiddenCount },
                    { defaultValue: 'Expand {{count}} replies' },
                  )
                : t('threadTree.collapse', {}, { defaultValue: 'Collapse thread' })
            }
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
          >
            {collapsed
              ? t('threadTree.expandSymbol', {}, { defaultValue: '[+]' })
              : t('threadTree.collapseSymbol', {}, { defaultValue: '[−]' })}
          </Pressable>
          <Box as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {comment.author}
          </Box>
          {typeof comment.score === 'number' && (
            <Text as="span" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'threadTree.score',
                { count: comment.score },
                { defaultValue: '{{count}} points' },
              )}
            </Text>
          )}
          {comment.createdAt && (
            <Text
              as="time"
              dateTime={comment.createdAt}
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
            >
              {comment.createdAt}
            </Text>
          )}
          {collapsed && hiddenCount > 0 && (
            <Text as="span" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'threadTree.hiddenReplies',
                { count: hiddenCount },
                { defaultValue: '{{count}} hidden' },
              )}
            </Text>
          )}
        </Box>
        {!collapsed && (
          <>
            {plainText ? (
              <Text
                as="p"
                className={bodyClasses}
                webStyle={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {comment.body}
              </Text>
            ) : (
              <Box as="div" className={bodyClasses}>
                {comment.body}
              </Box>
            )}
            <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
              {onUpvote && (
                <Pressable
                  as="button"
                  type="button"
                  onClick={onUpvoteClick}
                  data-mol-id={`thread-tree-upvote-${comment.id}`}
                  aria-pressed={!!comment.upvoted}
                  aria-label={t('threadTree.upvote', {}, { defaultValue: 'Upvote' })}
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
                >
                  {t('threadTree.upvote', {}, { defaultValue: 'Upvote' })}
                </Pressable>
              )}
              {onReply && (
                <Pressable
                  as="button"
                  type="button"
                  onClick={onReplyClick}
                  data-mol-id={`thread-tree-reply-${comment.id}`}
                  aria-label={t('threadTree.reply', {}, { defaultValue: 'Reply' })}
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
                >
                  {t('threadTree.reply', {}, { defaultValue: 'Reply' })}
                </Pressable>
              )}
            </Box>
          </>
        )}
      </Box>

      {hasChildren && !collapsed && (
        // A comment thread is nested lists, not an ARIA tree widget: plain
        // `ul`/`li` semantics (with the toggle's `aria-expanded` +
        // `aria-controls` carrying the state), so every `li` keeps its
        // `listitem` role and no tree keyboard model is implied.
        <Box as="ul" id={repliesId} className={cm.cn(cm.stack(1 as const))}>
          {comment.children!.map((child) => (
            <ThreadTreeNode
              key={child.id}
              comment={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              onReply={onReply}
              onUpvote={onUpvote}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

/**
 * Recursive nested-comment tree with per-node collapse / expand,
 * depth-based indentation, and reply / upvote slots. Apps own the data;
 * the component handles rendering, collapse state, and event dispatch.
 *
 * Intended for link-aggregator threads (HN-style), blog comments,
 * podcast / video comment sections, and AI-conversation transcripts
 * with branching replies.
 *
 * All UI text resolves through `t()` so apps localise via the companion
 * `@molecule/app-locales-feature-thread-tree` package. All styling
 * resolves through `getClassMap()` — no Tailwind utilities live here.
 *
 * @param props - Component props.
 * @param props.comments - Top-level comments (each may carry `children`).
 * @param props.onReply - Reply-button handler.
 * @param props.onUpvote - Upvote-button handler.
 * @param props.onCollapse - Optional handler called on collapse / expand.
 * @param props.defaultCollapsedDepth - Depth at which nodes auto-collapse (default 4).
 * @param props.className - Extra classes appended to the outer wrapper.
 * @param props.dataMolId - `data-mol-id` selector for AI-agent interaction.
 * @returns The rendered tree element.
 */
export function ThreadTree({
  comments,
  onReply,
  onUpvote,
  onCollapse,
  defaultCollapsedDepth = DEFAULT_COLLAPSED_DEPTH,
  className,
  dataMolId,
}: ThreadTreeProps): React.ReactElement {
  const cm = getClassMap()
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() =>
    computeInitialCollapsed(comments, defaultCollapsedDepth),
  )

  const onToggleCollapse = useCallback(
    (commentId: string) => {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        const wasCollapsed = next.has(commentId)
        if (wasCollapsed) next.delete(commentId)
        else next.add(commentId)
        onCollapse?.(commentId, !wasCollapsed)
        return next
      })
    },
    [onCollapse],
  )

  return (
    <Box
      as="ul"
      className={cm.cn(cm.stack(2 as const), className)}
      data-mol-id={dataMolId ?? 'thread-tree'}
    >
      {comments.map((c) => (
        <ThreadTreeNode
          key={c.id}
          comment={c}
          depth={0}
          collapsedIds={collapsedIds}
          onToggleCollapse={onToggleCollapse}
          onReply={onReply}
          onUpvote={onUpvote}
        />
      ))}
    </Box>
  )
}
