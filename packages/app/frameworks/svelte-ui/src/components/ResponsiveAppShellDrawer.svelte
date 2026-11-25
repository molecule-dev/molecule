<!--
  ResponsiveAppShellDrawer: the mobile nav drawer (<768px) — a left-anchored
  dialog panel over a backdrop, opened by the menu trigger the TopBar renders.
  Implements the WAI-ARIA APG dialog pattern: focus moves into the panel on
  open and returns to the previously focused element (the trigger) on close,
  Tab is trapped inside, Escape and backdrop clicks close, body scroll locks
  (reference-counted with any stacked Modal), and the shell closes it on SPA
  navigation. Renders nothing on desktop or while closed.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import { OverlayLayer } from '@molecule/app-overlay-dom'
  import { BodyPortal, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useShellContext } from '../shell-context.js'
  import { reactStyle } from '../style.js'
  import type { ResponsiveAppShellDrawerProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    children,
    header,
    navLabel,
    footer,
    showCloseButton = true,
    className,
    dataMolId = 'shell-drawer',
    closeDataMolId = 'shell-drawer-close',
    testId,
  }: ResponsiveAppShellDrawerProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const shell = useShellContext('ResponsiveAppShell.Drawer')
  // Rendered at two sites, so one derived carries it; `t` reads the binding's
  // locale version, so it follows a locale switch without a store read.
  const resolvedNavLabel = $derived(
    navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' }),
  )

  let panelRef = $state<HTMLDivElement | null>(null)
  // The element to restore focus to on close (React's previouslyFocusedRef).
  const open = $derived(shell.drawerOpen && !shell.isDesktop)
  // React's `typeof document === 'undefined'` guard (SSR renders nothing).
  const hasDocument = typeof document !== 'undefined'

  // Register presence so the TopBar knows a trigger is meaningful. Mounted
  // once per composition; the root's `hasDrawer` flips right after the first
  // commit.
  $effect(() => {
    shell.registerDrawer(true)
    return () => shell.registerDrawer(false)
  })

  const layer = new OverlayLayer()
  $effect(() => {
    layer.sync({
      open: open,
      kind: 'modal',
      surface: { current: panelRef },
      dismissKey: true,
      dismissBackdrop: true,
      focus: { trap: true, restore: 'opener' },
      lockScroll: true,
      onDismiss: shell.closeDrawer,
    })
  })
  onDestroy(() => layer.release())

  // The backdrop wrapper is a presentation layer around the panel: a click on
  // the wrapper itself (the backdrop) closes, and a click that bubbled up
  // from the panel stops here. Escape closes from the keyboard.
  const handleWrapperClick = (event: MouseEvent): void => {
    if (event.target === event.currentTarget) layer.dismissBackdrop()
    else event.stopPropagation()
  }
</script>

{#if open && hasDocument}
  <!-- Backdrop click-to-close; only a click on the wrapper itself (the
       backdrop) closes. -->
  <BodyPortal><div class={cm.overlay} aria-hidden="true"></div></BodyPortal>
  <BodyPortal
    ><div
      class={cm.cn(cm.position('fixed'), cm.inset0)}
      use:reactStyle={{ zIndex: 41 }}
      role="presentation"
      onclick={handleWrapperClick}
    >
      <div
        bind:this={panelRef}
        id={shell.drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={resolvedNavLabel}
        tabindex={-1}
        class={cm.cn(cm.flex({ direction: 'col' }), cm.surface, className)}
        use:reactStyle={{ width: shell.sidebarWidthPx, maxWidth: '85vw', overflowY: 'auto' }}
        data-mol-id={dataMolId}
        data-testid={testId}
      >
        {#if header || showCloseButton}<div
            class={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('p', 3),
              cm.shrink0,
            )}
          >
            {#if header}<div use:reactStyle={{ minWidth: 0 }}>
                <ReactNode node={header} />
              </div>{:else}<span aria-hidden="true"></span>{/if}{#if showCloseButton}<button
                type="button"
                onclick={shell.closeDrawer}
                aria-label={t('appShell.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                data-mol-id={closeDataMolId}
                class={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  cm.shrink0,
                  cm.roundedFull,
                  cm.cursorPointer,
                  cm.textMuted,
                )}><IconGlyph name="x-mark" className={cm.iconMd} /></button
              >{/if}
          </div>{/if}
        <nav aria-label={resolvedNavLabel} class={cm.cn(cm.flex1, cm.stack(1))}>
          {@render children?.()}
        </nav>
        {#if footer}<div
            class={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.borderT,
              cm.sp('p', 3),
              cm.shrink0,
            )}
          >
            <ReactNode node={footer} />
          </div>{/if}
      </div>
    </div></BodyPortal
  >
{/if}
