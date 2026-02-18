/**
 * Tooltip component.
 *
 * @module
 */

import React, { forwardRef, useCallback, useEffect,useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { TooltipPlacement,TooltipProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface Position {
  top: number
  left: number
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
 * Tooltip component.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    { content, children, placement = 'top', delay = 0, hasArrow: _hasArrow, className, style, testId },
    _ref,
  ) => {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
    const triggerRef = useRef<HTMLDivElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    const cm = getClassMap()

    const updatePosition = useCallback(() => {
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect()
        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const newPosition = calculatePosition(triggerRect, tooltipRect, placement)
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

    useEffect(() => {
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
          onFocus={show}
          onBlur={hide}
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
