<!--
  SettingsSidebar: the Svelte counterpart of
  `@molecule/app-settings-container-react`'s `SettingsSidebar` — a controlled
  vertical side-nav. Same props, same DOM for the same input; item labels and
  icons are snippets or plain text. The nav region's accessible name resolves
  through `t()` (`settingsContainer.aria.settings`); `ariaLabel` overrides it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { SettingsSidebarProps } from './types.js'

  let { items, activeId, onSelect, footer, ariaLabel, className }: SettingsSidebarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const navLabel = $derived(
    ariaLabel ?? t('settingsContainer.aria.settings', undefined, { defaultValue: 'Settings' }),
  )
</script>

<nav class={cm.cn(cm.stack(1), className)} aria-label={navLabel}>
  {#each items as item (item.id)}
    <button
      type="button"
      onclick={() => onSelect(item.id)}
      aria-current={item.id === activeId ? 'page' : undefined}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.textSize('sm'),
        item.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
      )}
    >
      {#if typeof item.icon === 'function'}{@render item.icon()}{:else if item.icon != null}{item.icon}{/if}
      <span>
        {#if typeof item.label === 'function'}{@render item.label()}{:else}{item.label}{/if}
      </span>
    </button>
  {/each}
  {#if footer}
    <div class={cm.sp('mt', 4)}>
      {#if typeof footer === 'function'}{@render footer()}{:else}{footer}{/if}
    </div>
  {/if}
</nav>
