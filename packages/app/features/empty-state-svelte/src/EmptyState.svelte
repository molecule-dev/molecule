<!--
  EmptyState: the Svelte counterpart of `@molecule/app-empty-state-react`'s
  `EmptyState` — centred icon + title + description + action for lists, feeds,
  boards, or tables that have no rows to render yet. Same props, same DOM for
  the same input; node props are snippets, or plain strings.
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  import { PresentWhileContent } from '@molecule/app-svelte'
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

  // React reads the action through `slot()`, so the description's bottom margin follows what the
  // action rendered, not the snippet's value (an `{#each}` over no rows leaves nothing behind).
  let actionRenders = $state(false)
  let syncAction: (() => void) | undefined
  const trackAction: Attachment<HTMLElement> = (section) => {
    const sync = (): void => {
      const description = section.querySelector(':scope > p')
      // The template's own indentation is whitespace text nodes; only real content counts.
      const nodes = Array.from(section.childNodes).filter(
        (node) =>
          node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim() !== ''),
      )
      actionRenders = description !== null && nodes[nodes.length - 1] !== description
    }
    syncAction = sync
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(section, { childList: true, characterData: true, subtree: true })
    return () => {
      observer.disconnect()
      syncAction = undefined
    }
  }
  $effect(() => {
    void content.action
    syncAction?.()
  })
</script>

<section
  {@attach trackAction}
  data-mol-id={dataMolId}
  class={cm.cn(
    cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
    cm.textCenter,
    cm.sp('p', 12),
    className,
  )}
>
  {#if icon}
    <PresentWhileContent
      tag="div"
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
    </PresentWhileContent>
  {/if}
  <h3 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
    {#if typeof content.title === 'function'}{@render content.title?.()}{:else}{content.title}{/if}
  </h3>
  {#if content.description}
    <PresentWhileContent tag="p" class={cm.cn(cm.maxW('md'), cm.sp('mb', actionRenders ? 6 : 0))}>
      {#if typeof content.description === 'function'}{@render content.description?.()}{:else}{content.description}{/if}
    </PresentWhileContent>
  {/if}
  {#if typeof content.action === 'function'}{@render content.action?.()}{:else}{content.action}{/if}
</section>
