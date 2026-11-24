<!--
  ListingCardMedia: the Svelte counterpart of
  `@molecule/app-listing-card-react`'s `ListingCardMedia` — the media slot at
  the top of a listing card. Same props (React names), same ClassMap tokens,
  inline styles and DOM. Locks the aspect ratio via an inline style, renders
  the caller's node instead of the `<img>` fallback, and puts `overlay` in an
  absolutely-positioned inset-0 layer.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ListingCardMediaProps } from './types.js'

  let { src, alt, children, aspect = '4/3', overlay, className }: ListingCardMediaProps = $props()

  const cm = $derived(getClassMap())
  const aspectRatio = $derived(aspect.replace('/', ' / '))
</script>

<div class={cm.cn(cm.position('relative'), className)} style="aspect-ratio: {aspectRatio}">
  <ContentOrElse>
    {#if typeof children === 'function'}{@render children?.()}{:else}{children}{/if}
    {#snippet otherwise()}
      {#if src}
        <img {src} alt={alt ?? ''} style="width: 100%; height: 100%; object-fit: cover" />
      {/if}
    {/snippet}
  </ContentOrElse>
  {#if overlay}
    <PresentWhileContent class={cm.cn(cm.position('absolute'), cm.inset0)}>
      {#if typeof overlay === 'function'}{@render overlay?.()}{:else}{overlay}{/if}
    </PresentWhileContent>
  {/if}
</div>
