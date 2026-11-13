<!--
  ResponsiveAppShellSidebar: the desktop sidebar (<aside> + <nav> landmarks).
  Renders NOTHING below 768px — the ResponsiveAppShellDrawer carries the nav
  there. Full viewport height, sticky at the top edge, scrolls internally when
  its content outgrows the viewport.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useShellContext } from '../shell-context.js'
  import { reactStyle } from '../style.js'
  import type { ResponsiveAppShellSidebarProps } from '../types.js'
  import ReactNode from './ReactNode.svelte'

  let {
    children,
    navLabel,
    footer,
    className,
    dataMolId = 'shell-sidebar',
    testId,
  }: ResponsiveAppShellSidebarProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const shell = useShellContext('ResponsiveAppShell.Sidebar')
</script>

{#if shell.isDesktop}
  <aside
    class={cm.cn(
      cm.flex({ direction: 'col' }),
      cm.shrink0,
      cm.surface,
      cm.borderR,
      cm.h('screen'),
      cm.position('sticky'),
      className,
    )}
    use:reactStyle={{ top: 0, width: shell.sidebarWidthPx, overflowY: 'auto' }}
    data-mol-id={dataMolId}
    data-testid={testId}
  >
    <nav
      aria-label={navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })}
      class={cm.cn(cm.flex1, cm.stack(1))}
    >
      {@render children?.()}
    </nav>
    {#if footer}<div
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.borderT,
          cm.sp('p', 3),
          cm.shrink0,
        )}
      >
        <ReactNode node={footer} />
      </div>{/if}
  </aside>
{/if}
