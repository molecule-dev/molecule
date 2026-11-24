<!--
  AppShellSideNav: the Svelte counterpart of
  `@molecule/app-nav-chrome-react`'s `AppShellSideNav` — vertical side nav
  with a flat item list or grouped sections, plus header/footer slots. Same
  props, same DOM for the same input; node props are snippets (or plain
  strings).
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AppShellSideNavProps } from './types.js'

  let { items, groups, activeId, onItemClick, header, footer, className }: AppShellSideNavProps =
    $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  /** The nav region's accessible name (locale-reactive). */
  const navLabel = $derived(t('navChrome.aria.sidebar', undefined, { defaultValue: 'Sidebar' }))
  /** React's `cm.sp('mt', 'auto')`; the spacing scale type omits `'auto'`. */
  const mountClass = $derived(cm.cn(cm.sp('mt', 'auto' as never)))
</script>

{#snippet navItem(it: NonNullable<AppShellSideNavProps['items']>[number])}
  <button
    type="button"
    onclick={() => onItemClick?.(it)}
    disabled={!!it.disabled}
    aria-current={it.id === activeId ? 'page' : undefined}
    class={cm.cn(
      cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )}
  >
    <span class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if typeof it.icon === 'function'}{@render it.icon?.()}{:else if it.icon != null}{it.icon}{/if}
      <span>
        {#if typeof it.label === 'function'}{@render it.label?.()}{:else}{it.label}{/if}
      </span>
    </span>
    {#if typeof it.badge === 'function'}{@render it.badge?.()}{:else if it.badge != null}{it.badge}{/if}
  </button>
{/snippet}

<aside class={cm.cn(cm.stack(4), className)}>
  {#if typeof header === 'function'}{@render header?.()}{:else if header != null}{header}{/if}
  <nav aria-label={navLabel} class={cm.stack(4)}>
    {#each items ?? [] as it (it.id)}
      {@render navItem(it)}
    {/each}
    {#each groups ?? [] as g (g.id)}
      <section class={cm.stack(1)}>
        {#if g.heading}
          <h3 class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('px', 3))}>
            {#if typeof g.heading === 'function'}{@render g.heading?.()}{:else}{g.heading}{/if}
          </h3>
        {/if}
        {#each g.items as it (it.id)}
          {@render navItem(it)}
        {/each}
      </section>
    {/each}
  </nav>
  {#if footer}
    <PresentWhileContent class={mountClass}>
      {#if typeof footer === 'function'}{@render footer?.()}{:else}{footer}{/if}
    </PresentWhileContent>
  {/if}
</aside>
