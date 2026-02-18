/**
 * Tooltip component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'
import { Portal } from 'solid-js/web'

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
  const [isVisible, setIsVisible] = createSignal(false)
  const [position, setPosition] = createSignal<Position>({ top: 0, left: 0 })
  // eslint-disable-next-line no-unassigned-vars -- assigned via SolidJS ref binding
  let triggerRef: HTMLDivElement | undefined
  // eslint-disable-next-line no-unassigned-vars -- assigned via SolidJS ref binding
  let tooltipRef: HTMLDivElement | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const placement = (): TooltipPlacement => local.placement || 'top'
  const delay = (): number => local.delay || 0

  const updatePosition = (): void => {
    if (triggerRef && tooltipRef) {
      const triggerRect = triggerRef.getBoundingClientRect()
      const tooltipRect = tooltipRef.getBoundingClientRect()
      const newPosition = calculatePosition(triggerRect, tooltipRect, placement())
      setPosition(newPosition)
    }
  }

  const show = (): void => {
    if (delay() > 0) {
      timeoutId = setTimeout(() => {
        setIsVisible(true)
      }, delay())
    } else {
      setIsVisible(true)
    }
  }

  const hide = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    setIsVisible(false)
  }

  createEffect(() => {
    if (isVisible()) {
      // Wait for next frame so tooltip element is rendered
      requestAnimationFrame(updatePosition)
    }
  })

  onCleanup(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        class={cm.tooltipTrigger}
      >
        {local.children as JSX.Element}
      </div>
      <Show when={isVisible()}>
        <Portal>
          <div
            ref={tooltipRef}
            role="tooltip"
            class={cm.cn(cm.tooltipContent, local.className)}
            style={{
              ...local.style,
              position: 'absolute',
              top: `${position().top}px`,
              left: `${position().left}px`,
              'z-index': 9999,
            }}
            data-testid={local.testId}
          >
            {local.content as JSX.Element}
          </div>
        </Portal>
      </Show>
    </>
  )
}
