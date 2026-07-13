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
  const [isVisible, setIsVisible] = createSignal(false)
  const [position, setPosition] = createSignal<Position>({ top: 0, left: 0 })
  // Hidden until positioned: the position is computed in rAF (after the element mounts),
  // so without this gate the tooltip would paint once at the default {0,0} top-left and
  // then jump to the correct spot — the flicker. Reveal only once it's placed.
  const [positioned, setPositioned] = createSignal(false)
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
      setPositioned(true)
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
    setPositioned(false)
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
        onFocus={handleFocus}
        onBlur={hide}
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
        <Portal>
          {/*
            Outer positioned wrapper carries the top/left/z-index placement +
            the positioned() visibility gate; the arrow renders as its
            SIBLING (not nested inside the visible box), because
            `tooltipContent` sets `overflow-hidden` — an arrow meant to poke
            past the box's own edge would be clipped invisible if it were a
            descendant of that element instead.
          */}
          <div
            style={{
              position: 'absolute',
              top: `${position().top}px`,
              left: `${position().left}px`,
              visibility: positioned() ? 'visible' : 'hidden',
              'z-index': 9999,
            }}
          >
            <div
              ref={tooltipRef}
              role="tooltip"
              class={cm.cn(cm.tooltipContent, local.className)}
              style={local.style}
              data-testid={local.testId}
            >
              {local.content as JSX.Element}
            </div>
            <Show when={local.hasArrow}>
              <span aria-hidden="true" style={getArrowStyle(placement())} />
            </Show>
          </div>
        </Portal>
      </Show>
    </>
  )
}
