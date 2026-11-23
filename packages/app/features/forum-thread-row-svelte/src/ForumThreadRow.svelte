<!--
  ForumThreadRow: the Svelte counterpart of
  `@molecule/app-forum-thread-row-react`'s `ForumThreadRow` — discussion-board
  thread row with title, optional excerpt, vote score, reply/view counts,
  pin/lock badges, author, timestamp, tag chips, and an optional vote-controls
  slot. Same props, same DOM for the same input. The marker labels ("Pinned" /
  "Locked", announced through `role="img"` + `aria-label`) and the counter
  labels ("votes", "{{count}} replies", "{{count}} views") go through `t()`
  with those English defaults — the same text, through the same keys, React
  renders.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ForumThreadRowProps } from './types.js'

  let {
    title,
    excerpt,
    voteScore,
    replyCount,
    viewCount,
    pinned,
    locked,
    author,
    createdAt,
    tags,
    voteControls,
    onClick,
    className,
  }: ForumThreadRowProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  // The row's own text, through the same keys React renders (each `t()` read
  // is tracked, so a locale switch re-renders).
  const pinnedLabel = (): string =>
    t('forumThreadRow.aria.pinned', undefined, { defaultValue: 'Pinned' })
  const lockedLabel = (): string =>
    t('forumThreadRow.aria.locked', undefined, { defaultValue: 'Locked' })
  const votesLabel = (): string =>
    t('forumThreadRow.label.votes', undefined, { defaultValue: 'votes' })
  const repliesText = (): string | undefined =>
    replyCount === undefined
      ? undefined
      : t(
          'forumThreadRow.label.replies',
          { count: replyCount },
          {
            defaultValue: '{{count}} replies',
          },
        )
  const viewsText = (): string | undefined =>
    viewCount === undefined
      ? undefined
      : t('forumThreadRow.label.views', { count: viewCount }, { defaultValue: '{{count}} views' })

  // The open button is named by the title: the id goes on the `<h3>` itself,
  // so the row's accessible name is the thread title. The whole row is the hit
  // area, not a CTA — an empty, transparent button over the row; the inline
  // background/border/padding are native resets. React writes the shorthand
  // `border: 'none'` and `padding: 0`, which the CSSOM serializes as
  // `border: medium` and `0px` — Svelte writes the style attribute directly,
  // so this writes that same serialized form (identical computed style).
  const nameId = $props.id()
</script>

<article
  class={cm.cn(
    cm.flex({ align: 'start', gap: 'sm' }),
    cm.sp('p', 3),
    onClick ? cm.position('relative') : undefined,
    className,
  )}
>
  {#if onClick}
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="forum-thread-row-open"
      onclick={() => onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style="background: transparent; border: medium; padding: 0px"
    ></button>
  {/if}
  {#if voteControls}
    <div class={cm.cn(cm.shrink0, onClick ? cm.position('relative') : undefined)}>
      {#if typeof voteControls === 'function'}{@render voteControls?.()}{:else}{voteControls}{/if}
    </div>
  {/if}
  {#if voteScore !== undefined && !voteControls}
    <div class={cm.cn(cm.shrink0, cm.textCenter, cm.stack(0))}>
      <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{voteScore}</span>
      <span class={cm.textSize('xs')}>{votesLabel()}</span>
    </div>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    <header class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      {#if pinned}
        <span role="img" aria-label={pinnedLabel()} title={pinnedLabel()}>📌</span>
      {/if}
      {#if locked}
        <span role="img" aria-label={lockedLabel()} title={lockedLabel()}>🔒</span>
      {/if}
      <h3
        id={onClick ? nameId : undefined}
        class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}
      >
        {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
      </h3>
    </header>
    {#if excerpt}
      <p class={cm.textSize('sm')}>
        {#if typeof excerpt === 'function'}{@render excerpt?.()}{:else}{excerpt}{/if}
      </p>
    {/if}
    <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      {#if author}
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {#if typeof author === 'function'}{@render author?.()}{:else}{author}{/if}
        </span>
      {/if}
      {#if createdAt}
        <span class={cm.textSize('xs')}>
          · {#if typeof createdAt === 'function'}{@render createdAt?.()}{:else}{createdAt}{/if}
        </span>
      {/if}
      {#if repliesText() !== undefined}
        <span class={cm.textSize('xs')}>· {repliesText()}</span>
      {/if}
      {#if viewsText() !== undefined}
        <span class={cm.textSize('xs')}>· {viewsText()}</span>
      {/if}
    </div>
    {#if tags}
      <div
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
          onClick ? cm.position('relative') : undefined,
        )}
      >
        {#if typeof tags === 'function'}{@render tags?.()}{:else}{tags}{/if}
      </div>
    {/if}
  </div>
</article>
