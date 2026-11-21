<!--
  Breadcrumb: the Svelte counterpart of `@molecule/app-breadcrumb-react`'s
  `Breadcrumb` — the same props (React names), the same DOM for the same
  input. Each item before the last is a link; the last item is plain text
  with `aria-current="page"`. The separator renders once per gap: the
  `separator` snippet/string when passed, else the default `/`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { BreadcrumbProps } from './types.js'

  let { items = [], onNavigate, separator, className, dataMolId }: BreadcrumbProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
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
            {#if typeof item.icon === 'function'}{@render item.icon()}{:else if item.icon != null}{item.icon}{/if}{#if typeof item.label === 'function'}{@render item.label()}{:else}{item.label}{/if}
          </span>
        </span>
      {:else if onNavigate}
        <button type="button" class={cm.link} onclick={() => onNavigate(item.to ?? '')}>
          <span class={cm.flex({ align: 'center', gap: 'xs' })}>
            {#if typeof item.icon === 'function'}{@render item.icon()}{:else if item.icon != null}{item.icon}{/if}{#if typeof item.label === 'function'}{@render item.label()}{:else}{item.label}{/if}
          </span>
        </button>
      {:else}
        <a href={item.to} class={cm.link}>
          <span class={cm.flex({ align: 'center', gap: 'xs' })}>
            {#if typeof item.icon === 'function'}{@render item.icon()}{:else if item.icon != null}{item.icon}{/if}{#if typeof item.label === 'function'}{@render item.label()}{:else}{item.label}{/if}
          </span>
        </a>
      {/if}
      {#if i !== items.length - 1}
        <span>
          {#if typeof separator === 'function'}{@render separator()}{:else if separator != null}{separator}{:else}<span
              aria-hidden="true">/</span
            >{/if}
        </span>
      {/if}
    </span>
  {/each}
</nav>
