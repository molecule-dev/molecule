<!--
  PageHeader: the Svelte counterpart of `@molecule/app-page-chrome-react`'s
  `PageHeader` — standard page-top header with optional breadcrumbs, leading
  icon, title / subtitle pair, meta row, and right-aligned actions. Same props
  (React names) and same DOM for the same input; node props are snippets (or
  plain text), rendered where React renders the node prop.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { PageHeaderProps } from './types.js'

  let {
    title,
    subtitle,
    icon,
    breadcrumbs,
    actions,
    meta,
    emphasis = 'normal',
    dataMolId,
    className,
  }: PageHeaderProps = $props()

  const cm = $derived(getClassMap())
  const titleClass = $derived(
    emphasis === 'extrabold'
      ? cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'))
      : cm.cn(cm.textSize('3xl'), cm.fontWeight('bold')),
  )
</script>

{#snippet node(value: string | Snippet)}
  {#if typeof value === 'string'}{value}{:else}{@render value?.()}{/if}
{/snippet}

<header data-mol-id={dataMolId} class={cm.cn(cm.stack(3), className)}>
  {#if breadcrumbs}{@render node(breadcrumbs)}{/if}
  <div class={cm.flex({ justify: 'between', align: 'start', gap: 'md' })}>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if icon}{@render node(icon)}{/if}
      <div class={cm.stack(1)}>
        <h1 class={titleClass}>
          {#if title}{@render node(title)}{/if}
        </h1>
        {#if subtitle}
          <PresentWhileContent tag="p" class={cm.textSize('base')}
            >{@render node(subtitle)}</PresentWhileContent
          >
        {/if}
      </div>
    </div>
    {#if actions}
      <PresentWhileContent class={cm.flex({ align: 'center', gap: 'sm' })}
        >{@render node(actions)}</PresentWhileContent
      >
    {/if}
  </div>
  {#if meta}
    <PresentWhileContent class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
      >{@render node(meta)}</PresentWhileContent
    >
  {/if}
</header>
