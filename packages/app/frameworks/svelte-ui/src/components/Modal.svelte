<!--
  Modal: renders into a document.body portal (the overlay and the centering
  wrapper become direct body children, in mount order, with no extra wrapper
  element), implements the WAI-ARIA APG dialog pattern (focus moves in on
  open, Tab/Shift+Tab are trapped, focus returns on close) with a
  shared document stack so stacked dialogs only let the topmost one
  react to Escape and Tab, and reference-counts the body scroll lock.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import { OverlayLayer } from '@molecule/app-overlay-dom'
  import { BodyPortal, PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents, useGeneratedId } from '../dom.js'
  import { reactStyle, reactStyleText } from '../style.js'
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
    initialFocus,
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
  // Per-instance title id (React's useId): a hardcoded
  // 'modal-title' would duplicate the id whenever two modals are mounted.
  const instanceId = useGeneratedId()

  const layer = new OverlayLayer()
  // The browser replaces the server's inline branch during hydration, so client
  // children mount once, inside the portal.
  const browser = typeof document !== 'undefined'
  let origin = $state<HTMLTemplateElement | null>(null)
  let portalTarget = $state<HTMLElement | null>(null)
  $effect(() => {
    if (origin) portalTarget = origin.ownerDocument.body
    else if (!open) portalTarget = null
  })

  $effect(() => {
    layer.sync({
      open: open,
      kind: 'modal',
      surface: { current: ref },
      dismissKey: closeOnEscape,
      dismissBackdrop: closeOnOverlayClick,
      focus: { trap: true, initial: initialFocus, restore: 'opener' },
      lockScroll: preventScroll,
      onDismiss: () => onClose(),
    })
  })
  onDestroy(() => layer.release())

  // Every other declared prop (`id`, `title`, `aria-*`, `data-*`, `automationId`
  // as `data-mol-id`, the DOM event handlers) reaches the inner dialog; the
  // spread lands after the defaults, so a caller's `role`, `tabIndex` or
  // `aria-labelledby` replaces them (e.g. `role="alertdialog"`).
  const attributes = $derived(reactAttrs(withoutEvents(rest)))
  const wrapperStyle = $derived(centered ? undefined : { alignItems: 'flex-start' })

  // The wrapper is a presentation layer around the dialog: a click on the
  // wrapper itself (the backdrop) closes, and a click that bubbled up from
  // inside the dialog stops here, so it never reaches whatever rendered the
  // modal. Escape closes from the keyboard.
  const handleOverlayClick = (event: MouseEvent): void => {
    if (event.target !== event.currentTarget) {
      event.stopPropagation()
      return
    }
    layer.dismissBackdrop()
  }
</script>

{#snippet background()}
  <div class={cm.dialogOverlay} aria-hidden="true"></div>
{/snippet}

{#snippet presentation()}
  <!-- Centered placement uses the existing ClassMap and geometry. -->
  <div
    class={cm.dialogWrapper}
    style={browser ? undefined : reactStyleText(wrapperStyle)}
    use:reactStyle={wrapperStyle}
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
      style={browser ? undefined : reactStyleText(style)}
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

      {#if footer}<PresentWhileContent class={cm.dialogFooter}
          ><ReactNode node={footer} /></PresentWhileContent
        >{/if}
    </div>
  </div>
{/snippet}

{#if open}
  {#if browser}
    {#if !portalTarget}
      <template bind:this={origin}></template>
    {/if}
    <BodyPortal target={portalTarget}>{@render background()}</BodyPortal>
    <BodyPortal target={portalTarget}>{@render presentation()}</BodyPortal>
  {:else}
    {@render background()}
    {@render presentation()}
  {/if}
{/if}
