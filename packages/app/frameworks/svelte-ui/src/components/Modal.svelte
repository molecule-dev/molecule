<!--
  Modal: renders into a document.body portal (the overlay and the centering
  wrapper become direct body children, in mount order, with no extra wrapper
  element), implements the WAI-ARIA APG dialog pattern (focus moves in on
  open, Tab/Shift+Tab are trapped, focus returns on close) with a
  module-level open-modal stack so stacked dialogs only let the topmost one
  react to Escape and Tab, and reference-counts the body scroll lock.
-->
<script lang="ts">
  import { BodyPortal, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import {
    getFocusableElements,
    isTopOfModalStack,
    lockBodyScroll,
    popModalStack,
    pushModalStack,
    spreadEvents,
    unlockBodyScroll,
    useGeneratedId,
  } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { ModalProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    ref = $bindable(null),
    open,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    footer,
    centered = true,
    closeLabel,
    preventScroll = true,
    className,
    style,
    testId,
    ...rest
  }: ModalProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const resolvedCloseLabel = $derived(
    closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' }),
  )
  // Per-instance title id AND stack key (React's useId): a hardcoded
  // 'modal-title' would duplicate the id whenever two modals are mounted.
  const instanceId = useGeneratedId()

  // Effect A — stack registration + move focus INTO the dialog on open +
  // restore focus to whatever was focused before on close. Runs exactly
  // once per open/close transition, not on every re-render.
  $effect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    pushModalStack(instanceId)
    if (ref) {
      const focusables = getFocusableElements(ref)
      ;(focusables[0] ?? ref).focus()
    }
    return () => {
      popModalStack(instanceId)
      const toRestore = previouslyFocused
      if (toRestore && document.contains(toRestore)) toRestore.focus()
    }
  })

  // Effect B — reference-counted body scroll lock, independent of focus and
  // Escape handling so it can react to `preventScroll` toggling on its own.
  $effect(() => {
    if (!open || !preventScroll) return
    lockBodyScroll()
    return () => unlockBodyScroll()
  })

  // Effect C — Escape + Tab focus-trap. Re-subscribing when `onClose`
  // changes identity is safe (it only swaps which closure the listener
  // calls) and keeps the handler from closing over a stale `onClose`.
  $effect(() => {
    if (!open) return
    const close = onClose
    void closeOnEscape
    void instanceId
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (closeOnEscape && isTopOfModalStack(instanceId)) close()
        return
      }
      if (e.key !== 'Tab' || !isTopOfModalStack(instanceId)) return
      const el = ref
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

  // Every other declared prop (`id`, `title`, `aria-*`, `data-*`, `automationId`
  // as `data-mol-id`, the DOM event handlers) reaches the inner dialog; the
  // spread lands after the defaults, so a caller's `role`, `tabIndex` or
  // `aria-labelledby` replaces them (e.g. `role="alertdialog"`).
  const attributes = $derived(reactAttrs(withoutEvents(rest)))

  // The wrapper is a presentation layer around the dialog: a click on the
  // wrapper itself (the backdrop) closes, and a click that bubbled up from
  // inside the dialog stops here, so it never reaches whatever rendered the
  // modal. Escape closes from the keyboard (Effect C).
  const handleOverlayClick = (event: MouseEvent): void => {
    if (event.target !== event.currentTarget) {
      event.stopPropagation()
      return
    }
    if (closeOnOverlayClick) onClose()
  }
</script>

{#if open}
  <!-- Overlay background -->
  <BodyPortal><div class={cm.dialogOverlay} aria-hidden="true"></div></BodyPortal>

  <!-- Centering wrapper. `centered` has no ClassMap resolver option, so a
       top-anchored layout is the one inline-style exception the styling rule
       allows (same as React). -->
  <BodyPortal
    ><div
      class={cm.dialogWrapper}
      use:reactStyle={centered ? undefined : { alignItems: 'flex-start' }}
      role="presentation"
      onclick={handleOverlayClick}
    >
      <div
        bind:this={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? instanceId : undefined}
        tabindex={-1}
        class={cm.cn(cm.modal({ size }), className)}
        use:reactStyle={style}
        data-testid={testId}
        {...attributes}
        use:spreadEvents={rest}
      >
        {#if title}
          <div class={cm.dialogHeader}>
            <h2 id={instanceId} class={cm.dialogTitle}><ReactNode node={title} /></h2>
            {#if showCloseButton}
              <button
                type="button"
                onclick={onClose}
                class={cm.dialogClose}
                data-mol-id="modal-close"
                aria-label={resolvedCloseLabel}
              >
                <IconGlyph name="x-mark" className={cm.iconMd} />
              </button>
            {/if}
          </div>
        {:else if showCloseButton}
          <button
            type="button"
            onclick={onClose}
            class={cm.dialogCloseFloating}
            data-mol-id="modal-close"
            aria-label={resolvedCloseLabel}
          >
            <IconGlyph name="x-mark" className={cm.iconMd} />
          </button>
        {/if}

        <div class={cm.dialogBody}>{@render children?.()}</div>

        {#if footer}<div class={cm.dialogFooter}><ReactNode node={footer} /></div>{/if}
      </div>
    </div></BodyPortal
  >
{/if}
