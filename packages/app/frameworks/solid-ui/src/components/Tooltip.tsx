/**
 * Tooltip component.
 *
 * @module
 */

import {
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  on,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'

import { measureTooltipPosition, OverlayLayer } from '@molecule/app-overlay-dom'
import { BodyPortal, ResolveNode } from '@molecule/app-solid'
import type { TooltipPlacement } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { TooltipProps } from '../types.js'
import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

interface Position {
  top: number
  left: number
}

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

// Coordinate hover and delayed shows across all tooltip instances in a page.
// A document key avoids sharing an active control between distinct documents.
const activeTooltips = new WeakMap<Document, () => void>()

/**
 * Returns the arrow's inline position style for a given placement. The arrow
 * has no dedicated ClassMap resolver (`tooltip()` takes no options), so its
 * shape/position is expressed via a small inline style — the sanctioned
 * exception for values ClassMap cannot express. Its color is NOT hardcoded:
 * `var(--color-surface)` / `var(--color-border)` are the same CSS custom
 * properties the `bg-surface`/`border` classes in `tooltipContent` resolve
 * to, so the arrow always matches the tooltip body in both themes.
 * @param placement - The tooltip's resolved placement.
 * @returns Inline style positioning the rotated-square arrow for that placement.
 */
function getArrowStyle(placement: TooltipPlacement): JSX.CSSProperties {
  const half = ARROW_SIZE / 2
  const base: JSX.CSSProperties = {
    position: 'absolute',
    width: `${ARROW_SIZE}px`,
    height: `${ARROW_SIZE}px`,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  switch (placement) {
    case 'top':
      return {
        ...base,
        bottom: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'top-start':
      return { ...base, bottom: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'top-end':
      return { ...base, bottom: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'bottom':
      return {
        ...base,
        top: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'bottom-start':
      return { ...base, top: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'bottom-end':
      return { ...base, top: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'left':
      return {
        ...base,
        right: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    case 'right':
      return {
        ...base,
        left: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    default:
      return base
  }
}

/**
 * Whether the pointer just crossed INTO (or out of) an element's boundary.
 *
 * React implements `onMouseEnter`/`onMouseLeave` on top of the BUBBLING
 * `mouseover`/`mouseout` events (mouseenter/leave don't bubble, so a plain
 * listener on the wrapper never hears a hover that starts on a child).
 * This is the enter/leave test React applies: the move counts only when the
 * event's `relatedTarget` (the element the pointer came from / went to) is
 * OUTSIDE the wrapper — moving between descendants is not a boundary crossing.
 *
 * @param wrapper - The element the enter/leave handlers are attached to.
 * @param event - The bubbling mouseover/mouseout.
 * @returns True when the pointer crossed the wrapper's boundary.
 */
function crossedBoundary(wrapper: Element, event: MouseEvent): boolean {
  const related = event.relatedTarget
  return !(related instanceof Element && wrapper.contains(related))
}

/**
 * Tooltip component.
 *
 * `hasArrow` renders a small themed pointer at the resolved `placement` edge.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Tooltip = withDisplayName<WithRef<TooltipProps, HTMLDivElement>>((props) => {
  const [local, rest] = splitProps(props, [
    'content',
    'children',
    'placement',
    'delay',
    'hasArrow',
    'className',
    'style',
    'testId',
    'ref',
  ])

  const cm = getClassMap()
  // A caller's `id` names the tooltip box, so the association points at it.
  const generatedId = createUniqueId()
  const tooltipId = (): string => rest.id ?? generatedId
  const [isVisible, setIsVisible] = createSignal(false)
  const [position, setPosition] = createSignal<Position>({ top: 0, left: 0 })
  // Assigned through the SolidJS ref bindings below and read by the
  // positioning/focus code; declared unassigned on purpose.
  let triggerRef: HTMLDivElement | undefined
  let tooltipRef: HTMLDivElement | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let hideTimeoutId: ReturnType<typeof setTimeout> | undefined
  let owner: Document | undefined
  const layer = new OverlayLayer()

  const placement = (): TooltipPlacement => local.placement || 'top'
  const delay = (): number => local.delay || 0

  const updatePosition = (): void => {
    if (triggerRef && tooltipRef?.isConnected)
      setPosition(measureTooltipPosition(triggerRef, tooltipRef, placement()))
  }

  const hide = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    clearTimeout(hideTimeoutId)
    layer.release()
    if (owner && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
    owner = undefined
    setIsVisible(false)
  }

  const show = (): void => {
    const doc = triggerRef?.ownerDocument
    if (!doc) return
    if (owner && owner !== doc && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
    owner = doc
    const previous = activeTooltips.get(doc)
    if (previous !== hide) previous?.()
    // Claim before scheduling so another trigger also cancels pending shows.
    activeTooltips.set(doc, hide)
    clearTimeout(hideTimeoutId)
    clearTimeout(timeoutId)
    if (delay() > 0) {
      timeoutId = setTimeout(() => {
        setIsVisible(true)
      }, delay())
    } else {
      setIsVisible(true)
    }
  }

  // Allow the pointer to cross the placement gap into the tooltip itself.
  const scheduleHide = (): void => {
    clearTimeout(timeoutId)
    clearTimeout(hideTimeoutId)
    hideTimeoutId = setTimeout(hide, 150)
  }

  const keepVisible = (): void => {
    clearTimeout(hideTimeoutId)
  }

  // Show on focus ONLY for keyboard focus (:focus-visible). A mouse click or a
  // programmatic .focus() — e.g. a dropdown/menu returning focus to its trigger
  // after it closes — must NOT re-show a tooltip the click was meant to dismiss.
  // Guarded: engines without :focus-visible support throw on the unknown selector —
  // there we skip the focus-show (hover still works), the safe default.
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

  // Programmatically associates the tooltip with its trigger: when `children`
  // is exactly one element, it gets `aria-describedby` while the tooltip is
  // visible (and the attribute is removed again when hidden) — that id is what
  // a screen reader announces alongside the element's accessible name. For
  // text, fragments or multiple children there is no single node to attach the
  // id to, so the association is skipped rather than guessed.
  createEffect(() => {
    const wrapper = triggerRef
    const visible = isVisible()
    if (!wrapper) return
    const elements = Array.from(wrapper.children)
    const hasText = Array.from(wrapper.childNodes).some(
      (node) => node.nodeType === 3 && (node.textContent ?? '').trim() !== '',
    )
    const target = elements.length === 1 && !hasText ? elements[0] : null
    if (!target) return
    if (visible) target.setAttribute('aria-describedby', tooltipId())
    else target.removeAttribute('aria-describedby')
  })

  onCleanup(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    clearTimeout(hideTimeoutId)
    layer.release()
    if (owner && activeTooltips.get(owner) === hide) activeTooltips.delete(owner)
  })

  return (
    <>
      <div
        ref={(el) => {
          triggerRef = el
        }}
        // The wrapper is not a control: it listens for the events that bubble
        // up from the control inside it (hover, focus, Escape, a click), so it
        // is a presentation element and the control keeps its own role.
        role="presentation"
        onMouseOver={(event) => {
          if (crossedBoundary(triggerRef ?? event.currentTarget, event)) show()
        }}
        onMouseOut={(event) => {
          if (crossedBoundary(triggerRef ?? event.currentTarget, event)) scheduleHide()
        }}
        onFocusIn={handleFocus}
        onFocusOut={hide}
        // WCAG 1.4.13: hover/focus-triggered content must be dismissable
        // WITHOUT moving the pointer or focus — Escape hides the tooltip
        // (the keydown on the focused child bubbles up to this wrapper).
        onKeyDown={(event: KeyboardEvent) => {
          if (!isVisible() && event.key === 'Escape') hide()
        }}
        // Any click on a tooltip-wrapped control hides the tooltip — clicking a
        // button shouldn't leave its hover/focus tooltip lingering. The wrapper
        // wraps children directly, so this single handler covers every
        // button-with-tooltip consumer.
        onClick={hide}
        class={cm.tooltipTrigger}
      >
        {local.children}
      </div>
      <Show when={isVisible()}>
        <BodyPortal mount={triggerRef?.ownerDocument.body}>
          {/*
            Outer positioned wrapper carries the top/left/z-index placement +
            the positioned() visibility gate; the arrow renders as its
            SIBLING (not nested inside the visible box), because
            `tooltipContent` sets `overflow-hidden` — an arrow meant to poke
            past the box's own edge would be clipped invisible if it were a
            descendant of that element instead.
          */}
          <div
            style={toStyleProps({
              position: 'absolute',
              top: position().top,
              left: position().left,
              zIndex: 9999,
            })}
            onMouseOver={(event) => {
              if (crossedBoundary(event.currentTarget, event)) keepVisible()
            }}
            onMouseOut={(event) => {
              if (crossedBoundary(event.currentTarget, event)) scheduleHide()
            }}
          >
            {/* The content is read here, inside the visible branch, so its components are created
                only while the tooltip shows (React mounts them then). Reading `local.content`
                anywhere else, such as in an effect's dependency list, creates them too. */}
            <ResolveNode node={local.content}>
              {(content) => {
                // Position the tooltip when it shows, and again whenever its content changes:
                // React re-runs its layout effect on `content`, so content that expands
                // asynchronously (a "Loading" label that resolves into a longer one) keeps the
                // tooltip anchored above its trigger instead of staying at the height it was
                // first measured with. A microtask (not rAF), after the box is in the DOM, so
                // fake-timer environments place it too.
                createEffect(on(content, () => queueMicrotask(updatePosition)))
                createEffect(() =>
                  layer.sync({
                    open: isVisible(),
                    kind: 'tooltip',
                    surface: { current: tooltipRef ?? null },
                    anchor: { current: triggerRef ?? null },
                    dismissKey: true,
                    onDismiss: hide,
                  }),
                )
                return (
                  <div
                    ref={(el) => {
                      tooltipRef = el
                      // A caller's ref reaches the box too, as React forwards it there. Solid hands a
                      // component its ref as a callback prop, kept out of the spread below.
                      if (typeof local.ref === 'function') local.ref(el)
                    }}
                    id={tooltipId()}
                    role="tooltip"
                    class={cm.cn(cm.tooltipContent, local.className)}
                    style={toStyleProps(local.style)}
                    data-testid={local.testId}
                    {...reactDomProps(rest)}
                  >
                    {content()}
                  </div>
                )
              }}
            </ResolveNode>
            <Show when={local.hasArrow}>
              <span aria-hidden="true" style={toStyleProps(getArrowStyle(placement()))} />
            </Show>
          </div>
        </BodyPortal>
      </Show>
    </>
  )
}, 'Tooltip')
