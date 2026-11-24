<!--
  DetailHeader: the Svelte counterpart of `@molecule/app-detail-header-react`'s
  `DetailHeader` — leading slot + title/subtitle + status + right-aligned
  actions, with an optional meta row and an optional search slot. Same props,
  same DOM for the same input; the node props are snippets (or plain strings).
-->
<script lang="ts">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { DetailHeaderProps } from './types.js'

  let {
    title,
    subtitle,
    leading,
    status,
    actions,
    meta,
    search,
    sticky = false,
    className,
    dataMolId,
  }: DetailHeaderProps = $props()

  const cm = $derived(getClassMap())
</script>

<header
  data-mol-id={dataMolId}
  class={cm.cn(cm.stack(2), className)}
  style={sticky ? 'position: sticky; top: 0px; z-index: 10' : undefined}
>
  <div class={cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' })}>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if typeof leading === 'function'}{@render leading?.()}{:else if leading}{leading}{/if}
      <div class={cm.stack(1)}>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          <h1 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
          </h1>
          {#if typeof status === 'function'}{@render status?.()}{:else if status}{status}{/if}
        </div>
        {#if subtitle}
          <PresentWhileContent tag="p" class={cm.textSize('sm')}>
            {#if typeof subtitle === 'function'}{@render subtitle?.()}{:else}{subtitle}{/if}
          </PresentWhileContent>
        {/if}
      </div>
    </div>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if typeof search === 'function'}{@render search?.()}{:else if search}{search}{/if}
      {#if typeof actions === 'function'}{@render actions?.()}{:else if actions}{actions}{/if}
    </div>
  </div>
  {#if meta}
    <PresentWhileContent tag="div" class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
      {#if typeof meta === 'function'}{@render meta?.()}{:else}{meta}{/if}
    </PresentWhileContent>
  {/if}
</header>
