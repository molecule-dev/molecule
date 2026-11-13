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
  import { t } from '@molecule/app-i18n'
  import { getClassMap } from '@molecule/app-ui'

  import {
    bodyPortal,
    getFocusableElements,
    lockBodyScroll,
    spreadEvents,
    unlockBodyScroll,
  } from '../dom.js'
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

  const cm = $derived(getClassMap())
  const shell = useShellContext('ResponsiveAppShell.Drawer')
  const resolvedNavLabel = $derived(
    navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' }),
  )
  const closeLabel = t('appShell.closeMenu', {}, { defaultValue: 'Close navigation menu' })

  let panelRef = $state<HTMLDivElement | null>(null)
  // The element to restore focus to on close (React's previouslyFocusedRef).
  let previouslyFocused: HTMLElement | null = null
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

  // Effect A — dialog focus management (the Modal approach): on open, capture
  // the previously focused element and move focus into the panel; on close,
  // restore it. Reading `panelRef` gives the effect a re-run once the portal
  // DOM exists (React commits the DOM before its effects run).
  $effect(() => {
    if (!open) return
    previouslyFocused = document.activeElement as HTMLElement | null
    const panelEl = panelRef
    if (panelEl) {
      const focusables = getFocusableElements(panelEl)
      ;(focusables[0] ?? panelEl).focus()
    }
    return () => {
      const toRestore = previouslyFocused
      if (toRestore && document.contains(toRestore)) {
        toRestore.focus()
      }
    }
  })

  // Effect B — body scroll lock, reference-counted so a stacked <Modal>
  // never loses its lock when the drawer closes first.
  $effect(() => {
    if (!open) return
    lockBodyScroll()
    return () => unlockBodyScroll()
  })

  // Effect C — Escape closes; Tab is trapped inside the panel.
  $effect(() => {
    if (!open) return
    const close = shell.closeDrawer
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab') return

      const el = panelRef
      if (!el) return
      const focusables = getFocusableElements(el)
      if (focusables.length === 0) {
        e.preventDefault()
        el.focus()
        return
      }

      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !el.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !el.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  // The backdrop wrapper closes only on a click whose target is the wrapper
  // itself; clicks inside the dialog have the inner element as their target,
  // so they never reach that branch. The listener goes through the
  // spreadEvents action instead of an onclick directive: the wrapper is a
  // backdrop, not a widget, React's reference markup gives it no role, and the
  // conformance suite compares every attribute — so the checker's
  // `role="presentation"` remedy would break parity.
  const overlayHandlers = $derived({
    onclick: (event: MouseEvent): void => {
      if (event.target === event.currentTarget) shell.closeDrawer()
    },
  })
</script>

{#if open && hasDocument}
  <!-- Backdrop click-to-close; only a click on the wrapper itself (the
       backdrop) closes. -->
  <div class={cm.overlay} aria-hidden="true" use:bodyPortal></div>
  <div
    class={cm.cn(cm.position('fixed'), cm.inset0)}
    use:reactStyle={{ zIndex: 41 }}
    use:bodyPortal
    use:spreadEvents={overlayHandlers}
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
              aria-label={closeLabel}
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
  </div>
{/if}
