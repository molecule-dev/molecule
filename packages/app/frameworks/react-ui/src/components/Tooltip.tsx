/**
 * Tooltip component.
 *
 * @module
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import type { TooltipPlacement, TooltipProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface Position {
  top: number
  left: number
}

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

/**
 * Returns the arrow's inline position style for a given placement. The arrow
 * has no dedicated ClassMap resolver (`tooltip()` takes no options), so its
 * shape/position is expressed via a small inline style — the sanctioned
 * exception for values ClassMap cannot express. Its color is NOT hardcoded:
 * `var(--color-surface)` / `var(--color-border)` are the same CSS custom
 * properties the `bg-surface`/`border` Tailwind utilities in `tooltipContent`
 * resolve to (see `@molecule/app-ui-tailwind/base.css`), so the arrow always
 * matches the tooltip body in both themes.
 * @param placement - The tooltip's resolved placement.
 * @returns Inline style positioning the rotated-square arrow for that placement.
 */
function getArrowStyle(placement: TooltipPlacement): React.CSSProperties {
  const half = ARROW_SIZE / 2
  const base: React.CSSProperties = {
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

// Position the tooltip in a LAYOUT effect (synchronous, before the browser paints) so
// it's measured + placed in the same frame it mounts. With a plain useEffect (which
// runs AFTER paint) the tooltip paints once at the default {0,0} top-left and then jumps
// to the correct spot — the flicker. Fall back to useEffect on the server (no DOM) to
// avoid React's SSR useLayoutEffect warning.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

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
 * Tooltip component.
 *
 * `children` must be a single valid React element (e.g. one `<button>` or
 * one custom component that forwards `aria-describedby`) for the tooltip's
 * content to be programmatically associated with it — this is what lets a
 * screen reader announce the tooltip text for the actually-focused control.
 * A non-element `children` (plain text, a fragment, multiple nodes) still
 * shows the tooltip visually on hover/focus, but without that association.
 * `hasArrow` renders a small themed pointer at the resolved `placement`
 * edge.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    { content, children, placement = 'top', delay = 0, hasArrow = false, className, style, testId },
    _ref,
  ) => {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
    const triggerRef = useRef<HTMLDivElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    // Programmatically associates the tooltip with its trigger. A previous
    // version relied on the WRAPPER div's hover/focus — but the wrapper is
    // not itself the focused element, so its `aria-describedby` would never
    // be announced for the child that actually receives focus (see the
    // single-child cloning below).
    const tooltipId = useId()

    const cm = getClassMap()

    const updatePosition = useCallback(() => {
      // Guard against the effect firing without a DOM — SSR, or after the test
      // environment / portal root has been torn down while a show timer or a
      // pending effect was still queued. Accessing window/document then throws a
      // leaked "window is not defined" async error (the component already guards
      // `typeof document` at its portal site for the same reason).
      if (typeof window === 'undefined' || typeof document === 'undefined') return
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const newPosition = calculatePosition(triggerRect, tooltipRect, placement)
        // Clamp into the viewport so a wide/edge tooltip never spills off the page
        // (which would spawn a horizontal scrollbar). Positions are in document
        // space (they already include scrollX/scrollY); use clientWidth/clientHeight
        // — NOT innerWidth/innerHeight — so the page scrollbar is excluded. The
        // Math.max(min, max) guard keeps it on-screen even when the tooltip is wider
        // than the viewport.
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
    }, [placement])

    const show = useCallback(() => {
      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true)
        }, delay)
      } else {
        setIsVisible(true)
      }
    }, [delay])

    const hide = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsVisible(false)
    }, [])

    // Show on focus ONLY for keyboard focus (:focus-visible). A mouse click or a
    // programmatic .focus() — e.g. a dropdown/menu returning focus to its trigger
    // after it closes — must NOT re-show a tooltip the click was meant to dismiss
    // (which is why the "Device frame" tooltip lingered after opening + selecting).
    // Guarded: engines without :focus-visible support (older browsers, jsdom) throw
    // on the unknown selector — there we simply skip the focus-show (hover still
    // works), the safe default.
    const handleFocus = useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement
        try {
          if (typeof target.matches === 'function' && target.matches(':focus-visible')) {
            show()
          }
        } catch (_error) {
          // :focus-visible unsupported here — don't show on focus; hover still applies.
        }
      },
      [show],
    )

    useIsomorphicLayoutEffect(() => {
      if (isVisible) {
        updatePosition()
      }
    }, [isVisible, updatePosition])

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])

    // Outer positioned wrapper carries the top/left/zIndex placement; the
    // arrow renders as its SIBLING (not nested inside the visible box),
    // because `tooltipContent` sets `overflow-hidden` — an arrow meant to
    // poke past the box's own edge would be clipped invisible if it were a
    // descendant of that element instead.
    const tooltipElement = isVisible && (
      <div style={{ position: 'absolute', top: position.top, left: position.left, zIndex: 9999 }}>
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={cm.cn(cm.tooltipContent, className)}
          style={style}
          data-testid={testId}
        >
          {content as React.ReactNode}
        </div>
        {hasArrow && <span aria-hidden="true" style={getArrowStyle(placement)} />}
      </div>
    )

    // Single-child API (mirrors every mainstream tooltip library): when
    // `children` is exactly one valid element, clone it to inject
    // `aria-describedby` onto the actual focused/hovered node while the
    // tooltip is visible — that id is what a screen reader announces
    // alongside the element's accessible name. `children` is typed as
    // `ReactNode` (it could be a string, a fragment, or multiple nodes); for
    // anything other than a single element there is no single DOM node to
    // attach the id to, so the association is skipped rather than guessed —
    // documented in the module JSDoc as the supported contract.
    const isCloneableChild =
      React.isValidElement(children) && (children as React.ReactElement).type !== React.Fragment
    const describedChildren = isCloneableChild
      ? React.cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': isVisible ? tooltipId : undefined,
        })
      : (children as React.ReactNode)

    return (
      <>
        <div
          ref={triggerRef}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={handleFocus}
          onBlur={hide}
          // WCAG 1.4.13: hover/focus-triggered content must be dismissable
          // WITHOUT moving the pointer or focus — Escape hides the tooltip
          // (the keydown on the focused child bubbles up to this wrapper).
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') hide()
          }}
          // Any click on a tooltip-wrapped control hides the tooltip — clicking a
          // button shouldn't leave its hover/focus tooltip lingering. The wrapper
          // wraps children directly, so this single handler covers every
          // button-with-tooltip consumer.
          onClick={hide}
          className={cm.tooltipTrigger}
        >
          {describedChildren}
        </div>
        {typeof document !== 'undefined' &&
          tooltipElement &&
          createPortal(tooltipElement, document.body)}
      </>
    )
  },
)

Tooltip.displayName = 'Tooltip'
