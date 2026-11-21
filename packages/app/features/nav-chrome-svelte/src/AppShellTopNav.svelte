<!--
  AppShellTopNav: the Svelte counterpart of
  `@molecule/app-nav-chrome-react`'s `AppShellTopNav` — top bar with logo /
  items / right actions. Same props, same DOM for the same input; node props
  are snippets (or plain strings).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AppShellTopNavProps } from './types.js'

  let { logo, items, activeId, onItemClick, right, className }: AppShellTopNavProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  /** The centre nav region's accessible name (locale-reactive). */
  const navLabel = $derived(t('navChrome.aria.main', undefined, { defaultValue: 'Main' }))
</script>

<header
  class={cm.cn(
    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    className,
  )}
>
  <div class={cm.flex({ align: 'center', gap: 'lg' })}>
    {#if typeof logo === 'function'}{@render logo()}{:else if logo != null}{logo}{/if}
    {#if items && items.length > 0}
      <nav aria-label={navLabel} class={cm.flex({ align: 'center', gap: 'sm' })}>
        {#each items as it (it.id)}
          <button
            type="button"
            onclick={() => onItemClick?.(it)}
            disabled={!!it.disabled}
            aria-current={it.id === activeId ? 'page' : undefined}
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('sm'),
              it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
          >
            {#if typeof it.icon === 'function'}{@render it.icon()}{:else if it.icon != null}{it.icon}{/if}
            <span>
              {#if typeof it.label === 'function'}{@render it.label()}{:else}{it.label}{/if}
            </span>
            {#if typeof it.badge === 'function'}{@render it.badge()}{:else if it.badge != null}{it.badge}{/if}
          </button>
        {/each}
      </nav>
    {/if}
  </div>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    {#if typeof right === 'function'}{@render right()}{:else if right != null}{right}{/if}
  </div>
</header>
