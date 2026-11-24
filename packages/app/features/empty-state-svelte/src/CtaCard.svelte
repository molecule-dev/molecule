<!--
  CtaCard: the Svelte counterpart of `@molecule/app-empty-state-react`'s
  `CtaCard` — horizontal or vertical promotional card for "next-step" actions
  inside a page body. Same props, same DOM for the same input; node props are
  snippets, or plain strings.
-->
<script lang="ts">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { CtaCardProps } from './types.js'

  let {
    eyebrow,
    title,
    description,
    action,
    media,
    layout = 'vertical',
    dataMolId,
    className,
  }: CtaCardProps = $props()

  const cm = $derived(getClassMap())
  /** The layout direction (React's `layout === 'horizontal' ? 'row' : 'col'`). */
  const horizontal = $derived(layout === 'horizontal')
</script>

<section
  data-mol-id={dataMolId}
  class={cm.cn(
    cm.flex({
      direction: horizontal ? 'row' : 'col',
      align: horizontal ? 'center' : 'stretch',
      gap: 'md',
    }),
    cm.sp('p', 6),
    className,
  )}
>
  {#if media}
    <PresentWhileContent tag="div" class={cm.shrink0}>
      {#if typeof media === 'function'}{@render media?.()}{:else}{media}{/if}
    </PresentWhileContent>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(2))}>
    {#if eyebrow}
      <PresentWhileContent tag="div" class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
        {#if typeof eyebrow === 'function'}{@render eyebrow?.()}{:else}{eyebrow}{/if}
      </PresentWhileContent>
    {/if}
    <h3 class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
      {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
    </h3>
    {#if description}
      <PresentWhileContent tag="p">
        {#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}
      </PresentWhileContent>
    {/if}
    {#if action}
      <PresentWhileContent tag="div" class={cm.sp('mt', 2)}>
        {#if typeof action === 'function'}{@render action?.()}{:else}{action}{/if}
      </PresentWhileContent>
    {/if}
  </div>
</section>
