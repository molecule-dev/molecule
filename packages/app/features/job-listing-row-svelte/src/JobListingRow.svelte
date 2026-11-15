<!--
  JobListingRow: the Svelte counterpart of
  `@molecule/app-job-listing-row-react`'s `JobListingRow` — job-board row with
  title + company + location + type + salary + posted date, optional leading
  logo, tag chips, and right-side actions. Same props, same DOM for the same
  input. The location value is prefixed with the same hardcoded 📍 glyph
  React renders, and the meta fields carry the same literal middle-dot
  separators (there is no prop to change or localise them).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { JobListingRowProps } from './types.js'

  let {
    title,
    company,
    location,
    type,
    salary,
    postedAt,
    leading,
    actions,
    tags,
    onClick,
    className,
  }: JobListingRowProps = $props()

  const cm = $derived(getClassMap())
</script>

<!-- React's JobListingRow attaches onClick to the root <div> by design (its
     JSDoc: no button semantics — supply your own focus/keyboard affordance),
     so the same two a11y warnings React's DOM carries are intentional here. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  onclick={onClick}
  class={cm.cn(
    cm.flex({ align: 'start', gap: 'md' }),
    cm.sp('p', 3),
    onClick ? cm.cursorPointer : undefined,
    className,
  )}
>
  {#if leading}
    <div class={cm.shrink0}>
      {#if typeof leading === 'function'}{@render leading()}{:else}{leading}{/if}
    </div>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
      {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
    </h3>
    {#if company}
      <span class={cm.textSize('sm')}>
        {#if typeof company === 'function'}{@render company()}{:else}{company}{/if}
      </span>
    {/if}
    <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      {#if location}
        <span class={cm.textSize('xs')}>
          📍 {#if typeof location === 'function'}{@render location()}{:else}{location}{/if}
        </span>
      {/if}
      {#if type}
        <span class={cm.textSize('xs')}>
          · {#if typeof type === 'function'}{@render type()}{:else}{type}{/if}
        </span>
      {/if}
      {#if salary}
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          · {#if typeof salary === 'function'}{@render salary()}{:else}{salary}{/if}
        </span>
      {/if}
      {#if postedAt}
        <span class={cm.textSize('xs')}>
          · {#if typeof postedAt === 'function'}{@render postedAt()}{:else}{postedAt}{/if}
        </span>
      {/if}
    </div>
    {#if tags}
      <div class={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
        {#if typeof tags === 'function'}{@render tags()}{:else}{tags}{/if}
      </div>
    {/if}
  </div>
  {#if actions}
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}>
      {#if typeof actions === 'function'}{@render actions()}{:else}{actions}{/if}
    </div>
  {/if}
</div>
