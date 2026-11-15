<!--
  NoteCard: the Svelte counterpart of `@molecule/app-note-card-react`'s
  `NoteCard` — sticky-note style card with optional color tint, pinned
  indicator, and bottom-right actions. Same props (React names), same DOM for
  the same input. The root tint is applied through the CSSOM the way react-dom
  does (see `style.ts`); the accessible label of the pin indicator is the same
  literal React renders (`aria-label="Pinned"`) — the React package does not
  route it through i18n.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { NoteCardProps } from './types.js'

  let { title, body, color, pinned, modifiedAt, actions, onClick, className }: NoteCardProps =
    $props()

  const cm = $derived(getClassMap())
  const style = $derived({
    background: color ?? '#fef3c7',
    color: '#1f2937',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    position: 'relative',
  })
</script>

<!-- React's NoteCard attaches onClick to the <article> by design (its JSDoc:
     no button semantics — supply your own focus/keyboard affordance), so the
     same two a11y warnings React's DOM carries are intentional here. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article
  onclick={onClick}
  class={cm.cn(cm.stack(2), cm.sp('p', 3), onClick ? cm.cursorPointer : undefined, className)}
  use:reactStyle={style}
>
  {#if pinned}
    <span aria-label="Pinned" style="position: absolute; top: 6px; right: 6px">📌</span>
  {/if}
  {#if title}
    <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
      {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
    </h3>
  {/if}
  <div class={cm.textSize('sm')} style="white-space: pre-wrap">
    {#if typeof body === 'function'}{@render body()}{:else}{body}{/if}
  </div>
  {#if modifiedAt || actions}
    <footer class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
      {#if modifiedAt}
        <span class={cm.textSize('xs')}>
          {#if typeof modifiedAt === 'function'}{@render modifiedAt()}{:else}{modifiedAt}{/if}
        </span>
      {/if}
      {#if typeof actions === 'function'}{@render actions()}{:else}{actions}{/if}
    </footer>
  {/if}
</article>
