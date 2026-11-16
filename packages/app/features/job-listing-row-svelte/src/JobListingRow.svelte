<!--
  JobListingRow: the Svelte counterpart of
  `@molecule/app-job-listing-row-react`'s `JobListingRow` — job-board row with
  title + company + location + type + salary + posted date, optional leading
  logo, tag chips, and right-side actions. Same props, same DOM for the same
  input. The location value is prefixed with the same hardcoded 📍 glyph
  React renders, and the meta fields carry the same literal middle-dot
  separators (there is no prop to change or localise them). `onClick` covers
  the whole row with an empty, transparent native button that activates it.
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

  // The row's accessible name lives on the title: the open button points at
  // the `<h3>` with aria-labelledby.
  const nameId = $props.id()
</script>

<div
  class={cm.cn(
    cm.flex({ align: 'start', gap: 'md' }),
    cm.sp('p', 3),
    onClick ? cm.position('relative') : undefined,
    className,
  )}
>
  {#if onClick}
    <!-- mol-bespoke-button: the whole row is the hit area, not a CTA — an
         empty, transparent button over the row; the inline background/border/
         padding are native resets. -->
    <!-- The style values carry the form React's attribute shows after CSSOM
         (Svelte writes the attribute raw): the border is its initial `none`
         style at `medium` width, padding the pixel form of 0 — visually
         identical, textually equal to React. -->
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="job-listing-row-open"
      onclick={() => onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style="background: transparent; border: medium; padding: 0px;"
    ></button>
  {/if}
  {#if leading}
    <div class={cm.shrink0}>
      {#if typeof leading === 'function'}{@render leading()}{:else}{leading}{/if}
    </div>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    <h3 id={nameId} class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
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
      <div
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
          cm.position('relative'),
        )}
      >
        {#if typeof tags === 'function'}{@render tags()}{:else}{tags}{/if}
      </div>
    {/if}
  </div>
  {#if actions}
    <div
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0, cm.position('relative'))}
    >
      {#if typeof actions === 'function'}{@render actions()}{:else}{actions}{/if}
    </div>
  {/if}
</div>
