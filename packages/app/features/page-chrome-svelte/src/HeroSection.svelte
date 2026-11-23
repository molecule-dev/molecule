<!--
  HeroSection: the Svelte counterpart of `@molecule/app-page-chrome-react`'s
  `HeroSection` — dashboard / landing hero with a text column on the left and
  optional media on the right. Same props (React names) and same DOM for the
  same input; node props are snippets (or plain text).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import type { HeroSectionProps } from './types.js'

  let {
    eyebrow,
    title,
    description,
    primaryAction,
    secondaryAction,
    media,
    align = 'start',
    className,
    dataMolId,
  }: HeroSectionProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet node(value: string | Snippet)}
  {#if typeof value === 'string'}{value}{:else}{@render value?.()}{/if}
{/snippet}

<section
  data-mol-id={dataMolId}
  class={cm.cn(
    cm.flex({
      align: 'center',
      justify: media ? 'between' : 'start',
      gap: 'lg',
      wrap: 'wrap',
    }),
    cm.sp('py', 10),
    className,
  )}
>
  <div class={cm.cn(cm.stack(4), cm.flex1, align === 'center' ? cm.textCenter : undefined)}>
    {#if eyebrow}
      <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
        {@render node(eyebrow)}
      </div>
    {/if}
    <h1 class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
      {#if title}{@render node(title)}{/if}
    </h1>
    {#if description}
      <p class={cm.cn(cm.textSize('lg'), cm.maxW('2xl'))}>{@render node(description)}</p>
    {/if}
    {#if primaryAction || secondaryAction}
      <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {#if primaryAction}{@render node(primaryAction)}{/if}
        {#if secondaryAction}{@render node(secondaryAction)}{/if}
      </div>
    {/if}
  </div>
  {#if media}
    <div class={cm.shrink0}>{@render node(media)}</div>
  {/if}
</section>
