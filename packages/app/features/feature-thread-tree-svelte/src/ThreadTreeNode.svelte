<!--
  ThreadTreeNode: the Svelte counterpart of
  `@molecule/app-feature-thread-tree-react`'s recursive `ThreadTreeNode` (not a
  public React export) — one comment plus its (possibly collapsed) children.
  Same props (React names), same DOM for the same input.

  Plain-string bodies render in a paragraph; node-valued bodies (snippets)
  keep a block container without an extra paragraph around their own block
  elements.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ThreadTreeNode from './ThreadTreeNode.svelte'
  import type { Comment, ThreadTreeProps } from './types.js'

  /** Indent step (rem) applied per depth level. */
  const INDENT_REM_PER_DEPTH = 1

  /** Deepest level that still adds indentation. */
  const MAX_INDENT_DEPTH = 8

  let {
    comment,
    depth,
    collapsedIds,
    onToggleCollapse,
    onReply,
    onUpvote,
  }: {
    comment: Comment
    depth: number
    collapsedIds: Set<string>
    onToggleCollapse: (commentId: string) => void
    onReply?: ThreadTreeProps['onReply']
    onUpvote?: ThreadTreeProps['onUpvote']
  } = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

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
    for (const child of children) total += 1 + countDescendants(child.children)
    return total
  }

  const hasChildren = $derived(!!(comment.children && comment.children.length > 0))
  const collapsed = $derived(collapsedIds.has(comment.id))
  const hiddenCount = $derived(collapsed ? countDescendants(comment.children) : 0)
  const indentRem = $derived(Math.min(depth, MAX_INDENT_DEPTH) * INDENT_REM_PER_DEPTH)
  // Plain text is a paragraph. Rich children may already contain block
  // elements, so preserve their container rather than nesting paragraphs.
  const plainText = $derived(typeof comment.body === 'string')
  const bodyClasses = $derived(cm.cn(cm.textSize('sm'), cm.sp('m', 0)))
  // The replies list's id, wired to the toggle's `aria-controls` — Svelte's
  // `$props.id()`, the counterpart of React's `useId()`. Generated per
  // rendered node, never derived from the comment's data.
  const repliesId = $props.id()
</script>

<li
  class={cm.cn(cm.stack(1))}
  data-mol-id={`thread-tree-comment-${comment.id}`}
  data-thread-depth={depth}
  style:padding-left="{indentRem}rem"
>
  <article
    class={cm.cn(cm.stack(1), cm.sp('py', 2))}
    style:border-left={depth > 0 ? '2px solid currentColor' : undefined}
    style:padding-left={depth > 0 ? '0.5rem' : undefined}
    style:opacity={depth > 0 ? 0.95 : undefined}
  >
    <header class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      <button
        type="button"
        onclick={() => onToggleCollapse(comment.id)}
        data-mol-id={`thread-tree-toggle-${comment.id}`}
        aria-expanded={collapsed ? 'false' : 'true'}
        aria-controls={hasChildren && !collapsed ? repliesId : undefined}
        aria-label={collapsed
          ? t(
              'threadTree.expand',
              { count: hiddenCount },
              { defaultValue: 'Expand {{count}} replies' },
            )
          : t('threadTree.collapse', {}, { defaultValue: 'Collapse thread' })}
        class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
      >
        {collapsed
          ? t('threadTree.expandSymbol', {}, { defaultValue: '[+]' })
          : t('threadTree.collapseSymbol', {}, { defaultValue: '[−]' })}
      </button>
      <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
        {#if typeof comment.author === 'function'}{@render comment.author()}{:else}{comment.author}{/if}
      </span>
      {#if typeof comment.score === 'number'}
        <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t('threadTree.score', { count: comment.score }, { defaultValue: '{{count}} points' })}
        </span>
      {/if}
      {#if comment.createdAt}
        <time datetime={comment.createdAt} class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {comment.createdAt}
        </time>
      {/if}
      {#if collapsed && hiddenCount > 0}
        <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t(
            'threadTree.hiddenReplies',
            { count: hiddenCount },
            { defaultValue: '{{count}} hidden' },
          )}
        </span>
      {/if}
    </header>
    {#if !collapsed}
      {#if plainText}
        <p class={bodyClasses} style:white-space="pre-wrap" style:overflow-wrap="anywhere">
          {comment.body}
        </p>
      {:else}
        <div class={bodyClasses}>
          {#if typeof comment.body === 'function'}{@render comment.body()}{:else}{comment.body}{/if}
        </div>
      {/if}
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {#if onUpvote}
          <button
            type="button"
            onclick={() => onUpvote?.(comment.id, !comment.upvoted)}
            data-mol-id={`thread-tree-upvote-${comment.id}`}
            aria-pressed={comment.upvoted ? 'true' : 'false'}
            aria-label={t('threadTree.upvote', {}, { defaultValue: 'Upvote' })}
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
          >
            {t('threadTree.upvote', {}, { defaultValue: 'Upvote' })}
          </button>
        {/if}
        {#if onReply}
          <button
            type="button"
            onclick={() => onReply?.(comment.id)}
            data-mol-id={`thread-tree-reply-${comment.id}`}
            aria-label={t('threadTree.reply', {}, { defaultValue: 'Reply' })}
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)}
          >
            {t('threadTree.reply', {}, { defaultValue: 'Reply' })}
          </button>
        {/if}
      </div>
    {/if}
  </article>
  {#if hasChildren && !collapsed}
    <!-- A comment thread is nested lists, not an ARIA tree widget: plain
    `ul`/`li` semantics (with the toggle's `aria-expanded` + `aria-controls`
    carrying the state), so every `li` keeps its `listitem` role and no tree
    keyboard model is implied. -->
    <ul id={repliesId} class={cm.cn(cm.stack(1))}>
      {#each comment.children ?? [] as child (child.id)}
        <ThreadTreeNode
          comment={child}
          depth={depth + 1}
          {collapsedIds}
          {onToggleCollapse}
          {onReply}
          {onUpvote}
        />
      {/each}
    </ul>
  {/if}
</li>
