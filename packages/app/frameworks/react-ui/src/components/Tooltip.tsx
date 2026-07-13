/**
 * Tooltip component.
 *
 * @module
 */

import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { TooltipPlacement, TooltipProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface Position {
  top: number
  left: number
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
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      children,
      placement = 'top',
      delay = 0,
      hasArrow: _hasArrow,
      className,
      style,
      testId,
    },
    _ref,
  ) => {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
    const triggerRef = useRef<HTMLDivElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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

    const tooltipElement = isVisible && (
      <div
        ref={tooltipRef}
        role="tooltip"
        className={cm.cn(cm.tooltipContent, className)}
        style={{
          ...style,
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 9999,
        }}
        data-testid={testId}
      >
        {content as React.ReactNode}
      </div>
    )

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
          {children as React.ReactNode}
        </div>
        {typeof document !== 'undefined' &&
          tooltipElement &&
          createPortal(tooltipElement, document.body)}
      </>
    )
  },
)

Tooltip.displayName = 'Tooltip'
