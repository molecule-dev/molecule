<!--
  ForumThreadRow: the Svelte counterpart of
  `@molecule/app-forum-thread-row-react`'s `ForumThreadRow` — discussion-board
  thread row with title, optional excerpt, vote score, reply/view counts,
  pin/lock badges, author, timestamp, tag chips, and an optional vote-controls
  slot. Same props, same DOM for the same input. The counter labels ("votes",
  "replies", "views") and the pin/lock aria-labels are the same hardcoded
  English React renders (React has no companion locale bond yet).
-->
<script lang="ts">
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

  const cm = $derived(getClassMap())
</script>

<!-- React's ForumThreadRow attaches onClick to the root <article> by design
     (its JSDoc: no button semantics — supply your own keyboard affordance), so
     the same a11y warnings React's DOM carries are intentional here. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article
  onclick={onClick}
  class={cm.cn(
    cm.flex({ align: 'start', gap: 'sm' }),
    cm.sp('p', 3),
    onClick ? cm.cursorPointer : undefined,
    className,
  )}
>
  {#if voteControls}
    <div class={cm.shrink0}>
      {#if typeof voteControls === 'function'}{@render voteControls()}{:else}{voteControls}{/if}
    </div>
  {/if}
  {#if voteScore !== undefined && !voteControls}
    <div class={cm.cn(cm.shrink0, cm.textCenter, cm.stack(0))}>
      <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{voteScore}</span>
      <span class={cm.textSize('xs')}>votes</span>
    </div>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    <header class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      {#if pinned}
        <span aria-label="Pinned" title="Pinned">📌</span>
      {/if}
      {#if locked}
        <span aria-label="Locked" title="Locked">🔒</span>
      {/if}
      <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
        {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
      </h3>
    </header>
    {#if excerpt}
      <p class={cm.textSize('sm')}>
        {#if typeof excerpt === 'function'}{@render excerpt()}{:else}{excerpt}{/if}
      </p>
    {/if}
    <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      {#if author}
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {#if typeof author === 'function'}{@render author()}{:else}{author}{/if}
        </span>
      {/if}
      {#if createdAt}
        <span class={cm.textSize('xs')}>
          · {#if typeof createdAt === 'function'}{@render createdAt()}{:else}{createdAt}{/if}
        </span>
      {/if}
      {#if replyCount !== undefined}
        <span class={cm.textSize('xs')}>· {replyCount} replies</span>
      {/if}
      {#if viewCount !== undefined}
        <span class={cm.textSize('xs')}>· {viewCount} views</span>
      {/if}
    </div>
    {#if tags}
      <div class={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
        {#if typeof tags === 'function'}{@render tags()}{:else}{tags}{/if}
      </div>
    {/if}
  </div>
</article>
