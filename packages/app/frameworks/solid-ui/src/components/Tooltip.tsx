/**
 * Tooltip component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'

import type { TooltipPlacement, TooltipProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { BodyPortal } from '../utilities/portal.jsx'

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
 * Calculate tooltip position based on trigger element and placement.
 * @param triggerRect - The bounding rectangle of the trigger element.
 * @param tooltipRect - The bounding rectangle of the tooltip element.
 * @param placement - The desired tooltip placement direction.
 * @param offset - The pixel offset from the trigger element.
 * @returns The computed top and left position.
 */
function calculatePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
  offset = 8,
): Position {
  const { top, left, width, height } = triggerRect
  const tooltipWidth = tooltipRect.width
  const tooltipHeight = tooltipRect.height

  const positions: Record<TooltipPlacement, Position> = {
    top: {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX + width / 2 - tooltipWidth / 2,
    },
    bottom: {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX + width / 2 - tooltipWidth / 2,
    },
    left: {
      top: top + window.scrollY + height / 2 - tooltipHeight / 2,
      left: left + window.scrollX - tooltipWidth - offset,
    },
    right: {
      top: top + window.scrollY + height / 2 - tooltipHeight / 2,
      left: left + window.scrollX + width + offset,
    },
    'top-start': {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX,
    },
    'top-end': {
      top: top + window.scrollY - tooltipHeight - offset,
      left: left + window.scrollX + width - tooltipWidth,
    },
    'bottom-start': {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX,
    },
    'bottom-end': {
      top: top + window.scrollY + height + offset,
      left: left + window.scrollX + width - tooltipWidth,
    },
  }

  return positions[placement]
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
export const Tooltip: Component<TooltipProps> = (props) => {
  const [local] = splitProps(props, [
    'content',
    'children',
    'placement',
    'delay',
    'hasArrow',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const tooltipId = createUniqueId()
  const [isVisible, setIsVisible] = createSignal(false)
  const [position, setPosition] = createSignal<Position>({ top: 0, left: 0 })
  // Assigned through the SolidJS ref bindings below and read by the
  // positioning/focus code; declared unassigned on purpose.
  let triggerRef: HTMLDivElement | undefined
  let tooltipRef: HTMLDivElement | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let hideTimeoutId: ReturnType<typeof setTimeout> | undefined

  const placement = (): TooltipPlacement => local.placement || 'top'
  const delay = (): number => local.delay || 0

  const updatePosition = (): void => {
    if (!triggerRef || !tooltipRef) return
    const triggerRect = triggerRef.getBoundingClientRect()
    const tooltipRect = tooltipRef.getBoundingClientRect()
    const newPosition = calculatePosition(triggerRect, tooltipRect, placement())
    // Clamp into the viewport so a wide/edge tooltip never spills off the page
    // (which would spawn a horizontal scrollbar). Positions are in document
    // space (they already include scrollX/scrollY); use clientWidth/clientHeight
    // — NOT innerWidth/innerHeight — so the page scrollbar is excluded. The
    // Math.max(min, max) guard keeps it on-screen even when the tooltip is
    // wider than the viewport.
    const margin = 8
    const minLeft = window.scrollX + margin
    const maxLeft =
      window.scrollX + document.documentElement.clientWidth - tooltipRect.width - margin
    const minTop = window.scrollY + margin
    const maxTop =
      window.scrollY + document.documentElement.clientHeight - tooltipRect.height - margin
    newPosition.left = Math.min(Math.max(newPosition.left, minLeft), Math.max(minLeft, maxLeft))
    newPosition.top = Math.min(Math.max(newPosition.top, minTop), Math.max(minTop, maxTop))
    setPosition(newPosition)
  }

  const hide = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    clearTimeout(hideTimeoutId)
    if (activeTooltips.get(document) === hide) {
      activeTooltips.delete(document)
    }
    setIsVisible(false)
  }

  const show = (): void => {
    const previous = activeTooltips.get(document)
    if (previous !== hide) previous?.()
    // Claim before scheduling so another trigger also cancels pending shows.
    activeTooltips.set(document, hide)
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

  createEffect(() => {
    if (isVisible()) {
      // Position after the tooltip element exists in the DOM (the Show above
      // renders it in the same signal flush, after this effect was created).
      // A microtask — not rAF — so fake-timer environments place it too.
      queueMicrotask(updatePosition)
    }
  })

  // Hovered content must dismiss while focus stays in the editor/composer:
  // Escape anywhere in the document hides a visible tooltip.
  createEffect(() => {
    if (!isVisible()) return
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') hide()
    }
    document.addEventListener('keydown', onEscape)
    onCleanup(() => document.removeEventListener('keydown', onEscape))
  })

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
    if (visible) target.setAttribute('aria-describedby', tooltipId)
    else target.removeAttribute('aria-describedby')
  })

  onCleanup(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    clearTimeout(hideTimeoutId)
    if (activeTooltips.get(document) === hide) {
      activeTooltips.delete(document)
    }
  })

  return (
    <>
      <div
        ref={(el) => {
          triggerRef = el
        }}
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
          if (event.key === 'Escape') hide()
        }}
        // Any click on a tooltip-wrapped control hides the tooltip — clicking a
        // button shouldn't leave its hover/focus tooltip lingering. The wrapper
        // wraps children directly, so this single handler covers every
        // button-with-tooltip consumer.
        onClick={hide}
        class={cm.tooltipTrigger}
      >
        {local.children as JSX.Element}
      </div>
      <Show when={isVisible()}>
        <BodyPortal>
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
            <div
              ref={(el) => {
                tooltipRef = el
              }}
              id={tooltipId}
              role="tooltip"
              class={cm.cn(cm.tooltipContent, local.className)}
              style={toStyleProps(local.style)}
              data-testid={local.testId}
            >
              {local.content as JSX.Element}
            </div>
            <Show when={local.hasArrow}>
              <span aria-hidden="true" style={toStyleProps(getArrowStyle(placement()))} />
            </Show>
          </div>
        </BodyPortal>
      </Show>
    </>
  )
}
