<!--
  EmptyState: the Svelte counterpart of `@molecule/app-empty-state-react`'s
  `EmptyState` — centred icon + title + description + action for lists, feeds,
  boards, or tables that have no rows to render yet. Same props, same DOM for
  the same input; node props are snippets, or plain strings.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { EmptyStateComponentProps } from './props.js'

  let {
    icon,
    title,
    description,
    action,
    view,
    dataMolId,
    className,
    iconWrapperClassName,
  }: EmptyStateComponentProps = $props()

  const cm = $derived(getClassMap())
  /** The message to render: the selected view, or the general props. */
  const content = $derived(view ?? { title, description, action })
</script>

<section
  data-mol-id={dataMolId}
  class={cm.cn(
    cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
    cm.textCenter,
    cm.sp('p', 12),
    className,
  )}
>
  {#if icon}
    <div
      class={cm.cn(
        cm.w(20),
        cm.h(20),
        cm.roundedFull,
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('mb', 6),
        iconWrapperClassName,
      )}
    >
      {#if typeof icon === 'function'}{@render icon?.()}{:else}{icon}{/if}
    </div>
  {/if}
  <h3 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
    {#if typeof content.title === 'function'}{@render content.title?.()}{:else}{content.title}{/if}
  </h3>
  {#if content.description}
    <p class={cm.cn(cm.maxW('md'), cm.sp('mb', content.action ? 6 : 0))}>
      {#if typeof content.description === 'function'}{@render content.description?.()}{:else}{content.description}{/if}
    </p>
  {/if}
  {#if typeof content.action === 'function'}{@render content.action?.()}{:else}{content.action}{/if}
</section>
