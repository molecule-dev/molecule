<!--
  ResponsiveAppShellTopBar: the shell's <header> landmark — menu trigger
  (mobile, when a Drawer is composed), brand, and trailing actions. The menu
  trigger renders only while a ResponsiveAppShellDrawer is part of the
  composition AND the viewport is below the breakpoint; with `mobileOnly` the
  whole header renders nothing on desktop.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { useI18n } from '../framework.js'
  import { useShellContext } from '../shell-context.js'
  import { reactStyle } from '../style.js'
  import type { ResponsiveAppShellTopBarProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    brand,
    actions,
    mobileOnly = false,
    className,
    dataMolId = 'shell-topbar',
    testId,
  }: ResponsiveAppShellTopBarProps = $props()

  const { t } = useI18n()
  const cm = $derived(getClassMap())
  const shell = useShellContext('ResponsiveAppShell.TopBar')
  const triggerLabel = $derived(
    $t('appShell.openMenu', {}, { defaultValue: 'Open navigation menu' }),
  )
</script>

{#if !(mobileOnly && shell.isDesktop)}
  <header
    class={cm.cn(
      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
      cm.sp('px', 4),
      cm.h(14),
      cm.surface,
      cm.borderB,
      cm.position('sticky'),
      className,
    )}
    use:reactStyle={{ top: 0, zIndex: 20 }}
    data-mol-id={dataMolId}
    data-testid={testId}
  >
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))} use:reactStyle={{ minWidth: 0 }}>
      {#if shell.hasDrawer && !shell.isDesktop}<button
          type="button"
          onclick={shell.openDrawer}
          aria-label={triggerLabel}
          aria-expanded={shell.drawerOpen}
          aria-controls={shell.drawerId}
          data-mol-id="shell-drawer-open"
          class={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.shrink0,
            cm.roundedFull,
            cm.cursorPointer,
          )}
          use:reactStyle={{ width: 44, height: 44 }}
          ><IconGlyph name="menu" className={cm.iconMd} /></button
        >{/if}{#if brand}<div use:reactStyle={{ minWidth: 0 }}><ReactNode node={brand} /></div>{/if}
    </div>
    {#if actions}<div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}>
        <ReactNode node={actions} />
      </div>{/if}
  </header>
{/if}
