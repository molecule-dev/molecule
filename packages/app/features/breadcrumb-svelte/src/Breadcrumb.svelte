<!--
  Breadcrumb: the Svelte counterpart of `@molecule/app-breadcrumb-react`'s
  `Breadcrumb` — the same props (React names), the same DOM for the same
  input. Each item before the last is a link; the last item is plain text
  with `aria-current="page"`. The separator renders once per gap: the
  `separator` snippet/string when passed, else the default `/`.
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { BreadcrumbProps } from './types.js'

  let { items = [], onNavigate, separator, className, dataMolId }: BreadcrumbProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  // A snippet cannot tell from its value whether it renders anything, so the default `/` stands in
  // while the `separator` snippet renders nothing (React's `separator ?? <span aria-hidden>/</span>`).
  const separatorFallback: Attachment<HTMLSpanElement> = (span) => {
    if (typeof separator !== 'function') return
    const fallback = document.createElement('span')
    fallback.setAttribute('aria-hidden', 'true')
    fallback.textContent = '/'
    const hasContent = (): boolean =>
      Array.from(span.childNodes).some(
        (node) =>
          node !== fallback &&
          (node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim() !== '')),
      )
    const sync = (): void => {
      if (hasContent()) fallback.remove()
      else if (!fallback.parentNode) span.appendChild(fallback)
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(span, { childList: true, characterData: true, subtree: true })
    return () => {
      observer.disconnect()
      fallback.remove()
    }
  }
  // The nav's accessible name: `t()` with the English default `'Breadcrumb'`,
  // so it follows the app's locale (React's source of truth).
  const navLabel = $derived(
    t('breadcrumb.aria.breadcrumb', undefined, { defaultValue: 'Breadcrumb' }),
  )
</script>

<nav
  aria-label={navLabel}
  data-mol-id={dataMolId}
  class={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), cm.textSize('sm'), className)}
>
  {#each items as item, i (i)}
    <span class={cm.flex({ align: 'center', gap: 'xs' })}>
      {#if i === items.length - 1 || !item.to}
        <span aria-current={i === items.length - 1 ? 'page' : undefined}>
          <span class={cm.flex({ align: 'center', gap: 'xs' })}>
            {#if typeof item.icon === 'function'}{@render item.icon?.()}{:else if item.icon != null}{item.icon}{/if}{#if typeof item.label === 'function'}{@render item.label?.()}{:else}{item.label}{/if}
          </span>
        </span>
      {:else if onNavigate}
        <button type="button" class={cm.link} onclick={() => onNavigate(item.to ?? '')}>
          <span class={cm.flex({ align: 'center', gap: 'xs' })}>
            {#if typeof item.icon === 'function'}{@render item.icon?.()}{:else if item.icon != null}{item.icon}{/if}{#if typeof item.label === 'function'}{@render item.label?.()}{:else}{item.label}{/if}
          </span>
        </button>
      {:else}
        <a href={item.to} class={cm.link}>
          <span class={cm.flex({ align: 'center', gap: 'xs' })}>
            {#if typeof item.icon === 'function'}{@render item.icon?.()}{:else if item.icon != null}{item.icon}{/if}{#if typeof item.label === 'function'}{@render item.label?.()}{:else}{item.label}{/if}
          </span>
        </a>
      {/if}
      {#if i !== items.length - 1}
        <span {@attach separatorFallback}>
          {#if typeof separator === 'function'}{@render separator?.()}{:else if separator != null}{separator}{:else}<span
              aria-hidden="true">/</span
            >{/if}
        </span>
      {/if}
    </span>
  {/each}
</nav>
