<!--
  HeroSection: the Svelte counterpart of `@molecule/app-page-chrome-react`'s
  `HeroSection` — dashboard / landing hero with a text column on the left and
  optional media on the right. Same props (React names) and same DOM for the
  same input; node props are snippets (or plain text).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'

  import { PresentWhileContent } from '@molecule/app-svelte'
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

  // React's `slot(media)`: the media column — and the root's `between` justify — exist only while
  // the media node renders something. A snippet's `{#each}` over no rows changes the DOM without
  // changing the prop, so presence is read from the rendered DOM: the media column is the text
  // column's only sibling, and `PresentWhileContent` keeps it in the page while it has content.
  let mediaRenders = $state(false)
  const trackMedia: Attachment<HTMLElement> = (section) => {
    const sync = (): void => {
      mediaRenders = section.children.length > 1
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(section, { childList: true, subtree: false })
    return () => observer.disconnect()
  }
</script>

{#snippet node(value: string | Snippet)}
  {#if typeof value === 'string'}{value}{:else}{@render value?.()}{/if}
{/snippet}

<section
  {@attach trackMedia}
  data-mol-id={dataMolId}
  class={cm.cn(
    cm.flex({
      align: 'center',
      justify: mediaRenders ? 'between' : 'start',
      gap: 'lg',
      wrap: 'wrap',
    }),
    cm.sp('py', 10),
    className,
  )}
>
  <div class={cm.cn(cm.stack(4), cm.flex1, align === 'center' ? cm.textCenter : undefined)}>
    {#if eyebrow}
      <PresentWhileContent class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        >{@render node(eyebrow)}</PresentWhileContent
      >
    {/if}
    <h1 class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
      {#if title}{@render node(title)}{/if}
    </h1>
    {#if description}
      <PresentWhileContent tag="p" class={cm.cn(cm.textSize('lg'), cm.maxW('2xl'))}
        >{@render node(description)}</PresentWhileContent
      >
    {/if}
    {#if primaryAction || secondaryAction}
      <PresentWhileContent class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
        >{#if primaryAction}{@render node(primaryAction)}{/if}{#if secondaryAction}{@render node(
            secondaryAction,
          )}{/if}</PresentWhileContent
      >
    {/if}
  </div>
  {#if media}
    <PresentWhileContent class={cm.shrink0}>{@render node(media)}</PresentWhileContent>
  {/if}
</section>
