<!--
  AppShellBottomNav: the Svelte counterpart of
  `@molecule/app-nav-chrome-react`'s `AppShellBottomNav` — mobile bottom tab
  bar. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AppShellBottomNavProps } from './types.js'

  let { items, activeId, onItemClick, className }: AppShellBottomNavProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  /** The nav region's accessible name (locale-reactive). */
  const navLabel = $derived(t('navChrome.aria.bottom', undefined, { defaultValue: 'Bottom' }))
</script>

<nav aria-label={navLabel} class={cm.cn(cm.flex({ align: 'stretch' }), className)}>
  {#each items as it (it.id)}
    <button
      type="button"
      onclick={() => onItemClick?.(it)}
      disabled={!!it.disabled}
      aria-current={it.id === activeId ? 'page' : undefined}
      class={cm.cn(
        cm.flex1,
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
        cm.sp('py', 2),
        cm.textSize('xs'),
        it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
      )}
    >
      {#if typeof it.icon === 'function'}{@render it.icon?.()}{:else if it.icon != null}{it.icon}{/if}
      <span>
        {#if typeof it.label === 'function'}{@render it.label?.()}{:else}{it.label}{/if}
      </span>
    </button>
  {/each}
</nav>
