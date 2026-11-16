<!--
  ListingCardBody: the Svelte counterpart of
  `@molecule/app-listing-card-react`'s `ListingCardBody` — title / subtitle /
  price / meta rows stacked. Same props (React names), same ClassMap tokens,
  same DOM. Every optional row renders only when its prop carries something,
  exactly as React's `{node && …}` conditions do; each node prop is a snippet
  or plain text.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ListingCardBodyProps } from './types.js'

  let { title, subtitle, price, meta, className }: ListingCardBodyProps = $props()

  const cm = $derived(getClassMap())

  /**
   * Whether React would render a node prop: `node && …` renders nothing for
   * `null`, `undefined`, `false` and the empty string, and everything else.
   *
   * @param node - The node prop value.
   * @returns True when the region renders.
   */
  const renders = (node: unknown): boolean =>
    node !== undefined && node !== null && node !== false && node !== ''
</script>

<div class={cm.cn(cm.stack(1), cm.sp('p', 3), className)}>
  <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
    {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
  </h3>
  {#if renders(subtitle)}
    <p class={cm.textSize('sm')}>
      {#if typeof subtitle === 'function'}{@render subtitle()}{:else}{subtitle}{/if}
    </p>
  {/if}
  {#if renders(price)}
    <p class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
      {#if typeof price === 'function'}{@render price()}{:else}{price}{/if}
    </p>
  {/if}
  {#if renders(meta)}
    <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      {#if typeof meta === 'function'}{@render meta()}{:else}{meta}{/if}
    </div>
  {/if}
</div>
