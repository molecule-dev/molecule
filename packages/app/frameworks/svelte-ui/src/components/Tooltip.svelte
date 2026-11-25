<!--
  Tooltip: hover/focus tooltip with placement math, optional arrow, delayed
  shows and cross-instance coordination (entering another trigger dismisses
  this one, including pending delayed shows). The positioned box renders in
  a document.body portal; while visible the single child element carries
  aria-describedby pointing at the tooltip.
-->
<script module lang="ts">
  // Coordinate hover and delayed shows across ALL tooltip instances in a page.
  // This lives in the module script so every instance shares the one map; in
  // the instance script each Tooltip would get its own, and entering a second
  // trigger would leave the first tooltip visible.
  const activeTooltips = new WeakMap<Document, () => void>()
</script>

<script lang="ts">
  import { measureTooltipPosition, OverlayLayer } from '@molecule/app-overlay-dom'
  import { BodyPortal, contentNodes } from '@molecule/app-svelte'
  import type { TooltipPlacement } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents, useGeneratedId } from '../dom.js'
  import { type CSSStyle, reactStyle } from '../style.js'
  import type { TooltipProps } from '../types.js'
  import ReactNode from './ReactNode.svelte'

  /** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
  const ARROW_SIZE = 8

  /** The arrow's inline style for a placement (the sanctioned ClassMap exception). */
  const arrowStyle = (placement: TooltipPlacement): CSSStyle => {
    const half = ARROW_SIZE / 2
    const base: CSSStyle = {
      position: 'absolute',
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
    }
    switch (placement) {
      case 'top':
        return { ...base, bottom: -half, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
      case 'top-start':
        return { ...base, bottom: -half, left: 12, transform: 'rotate(45deg)' }
      case 'top-end':
        return { ...base, bottom: -half, right: 12, transform: 'rotate(45deg)' }
      case 'bottom':
        return { ...base, top: -half, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
      case 'bottom-start':
        return { ...base, top: -half, left: 12, transform: 'rotate(45deg)' }
      case 'bottom-end':
        return { ...base, top: -half, right: 12, transform: 'rotate(45deg)' }
      case 'left':
        return { ...base, right: -half, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }
      case 'right':
        return { ...base, left: -half, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }
      default:
        return base
    }
  }

  let {
    ref = $bindable(null),
    content,
    children,
    placement = 'top',
    delay = 0,
    hasArrow = false,
    className,
    style,
    testId,
    ...rest
  }: TooltipProps = $props()

  let isVisible = $state(false)
  let position = $state<{ top: number; left: number }>({ top: 0, left: 0 })
  let triggerEl = $state<HTMLDivElement | null>(null)
  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  // A caller's `id` names the tooltip box, so the association points at it.
  const generatedId = useGeneratedId()
  const tooltipId = $derived(String(rest.id ?? generatedId))
  // The box carries every declared prop: className, style, testId, and the
  // rest (id, title, aria-*, data-*, automationId as data-mol-id, handlers).
  const attributes = $derived(reactAttrs(withoutEvents(rest)))

  const cm = $derived(getClassMap())
  const layer = new OverlayLayer()
  let owner: Document | undefined

  const updatePosition = (): void => {
    if (!triggerEl || !ref) return
    position = measureTooltipPosition(triggerEl, ref, placement)
  }

  const hide = (): void => {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    if (owner && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
    owner = undefined
    isVisible = false
  }

  const show = (): void => {
    const doc = triggerEl?.ownerDocument
    if (doc) {
      if (owner && owner !== doc && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
      owner = doc
      const previous = activeTooltips.get(doc)
      if (previous !== hide) previous?.()
      // Claim before scheduling so another trigger also cancels pending shows.
      activeTooltips.set(doc, hide)
    }
    if (hideTimer) clearTimeout(hideTimer)
    if (showTimer) clearTimeout(showTimer)
    if (delay > 0) {
      showTimer = setTimeout(() => (isVisible = true), delay)
    } else {
      isVisible = true
    }
  }

  // Allow the pointer to cross the placement gap into the tooltip itself.
  const scheduleHide = (): void => {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(hide, 150)
  }

  const keepVisible = (): void => {
    if (hideTimer) clearTimeout(hideTimer)
  }

  // Show on focus ONLY for keyboard focus (:focus-visible).
  const handleFocus = (event: FocusEvent): void => {
    const target = event.target as HTMLElement
    try {
      if (typeof target.matches === 'function' && target.matches(':focus-visible')) {
        show()
      }
    } catch (_error) {
      // :focus-visible unsupported here — don't show on focus; hover still applies.
    }
  }

  $effect(() => {
    layer.sync({
      open: isVisible,
      kind: 'tooltip',
      surface: { current: ref },
      anchor: { current: triggerEl },
      dismissKey: true,
      onDismiss: hide,
    })
  })

  // Position in the same frame the box mounts (React's layout effect).
  $effect(() => {
    if (isVisible) {
      void content
      updatePosition()
    }
  })

  $effect(() => {
    return () => {
      if (showTimer) clearTimeout(showTimer)
      if (hideTimer) clearTimeout(hideTimer)
      layer.release()
      if (owner && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
    }
  })

  // React injects aria-describedby onto the single child ELEMENT while the
  // tooltip is visible (cloneElement). A snippet cannot be cloned, so the
  // wrapper's single contributed element carries the attribute instead.
  $effect(() => {
    if (!triggerEl) return
    // Comment anchors and empty placeholder text nodes are Svelte bookkeeping.
    const nodes = contentNodes(triggerEl)
    const single = nodes.length === 1 && nodes[0]!.nodeType === 1 ? (nodes[0] as HTMLElement) : null
    if (!single) return
    if (isVisible) single.setAttribute('aria-describedby', tooltipId)
    else single.removeAttribute('aria-describedby')
  })

  // The trigger wrapper is not a control: it listens for the events that
  // bubble up from the control inside it (hover, focus, Escape, a click), so
  // it is a presentation element and the control keeps its own role.
  const handleMouseOver = (event: MouseEvent): void => {
    // React derives onMouseEnter from the BUBBLING mouseover (with a
    // relatedTarget check); a raw mouseenter listener would miss events
    // dispatched on the child trigger.
    if (event.relatedTarget && triggerEl?.contains(event.relatedTarget as Node)) return
    show()
  }
  const handleMouseOut = (event: MouseEvent): void => {
    if (event.relatedTarget && triggerEl?.contains(event.relatedTarget as Node)) return
    scheduleHide()
  }
  // WCAG 1.4.13: hover/focus-triggered content must be dismissable WITHOUT
  // moving the pointer or focus — Escape hides the tooltip (the keydown on
  // the focused child bubbles up to this wrapper).
  const handleTriggerKeyDown = (event: KeyboardEvent): void => {
    if (!isVisible && event.key === 'Escape') hide()
  }
  // The floating box wrapper is non-semantic (the tooltip box itself carries
  // role="tooltip") and its listeners forward no consumer events, so they go
  // through the spreadEvents action instead of event directives.
  const boxHandlers = {
    onmouseenter: keepVisible,
    onmouseleave: scheduleHide,
  }
</script>

<!-- Any click on a tooltip-wrapped control hides the tooltip — clicking a
     button shouldn't leave its hover/focus tooltip lingering. The wrapper
     wraps children directly, so this single handler covers every
     button-with-tooltip consumer. -->
<div
  bind:this={triggerEl}
  role="presentation"
  onmouseover={handleMouseOver}
  onmouseout={handleMouseOut}
  onfocusin={handleFocus}
  onfocusout={hide}
  onkeydown={handleTriggerKeyDown}
  onclick={hide}
  class={cm.tooltipTrigger}
>
  {@render children?.()}
</div>
{#if isVisible && triggerEl}
  <!-- The arrow renders as the box's SIBLING: tooltipContent sets
       overflow-hidden, so a nested arrow would be clipped invisible. -->
  <BodyPortal target={triggerEl.ownerDocument.body}
    ><div
      use:reactStyle={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      use:spreadEvents={boxHandlers}
    >
      <div
        bind:this={ref}
        id={tooltipId}
        role="tooltip"
        class={cm.cn(cm.tooltipContent, className)}
        use:reactStyle={style}
        data-testid={testId}
        {...attributes}
        use:spreadEvents={rest}
      >
        <ReactNode node={content} />
      </div>
      {#if hasArrow}<span aria-hidden="true" use:reactStyle={arrowStyle(placement)}></span>{/if}
    </div></BodyPortal
  >
{/if}
