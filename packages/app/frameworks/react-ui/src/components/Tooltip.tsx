/**
 * Tooltip component.
 *
 * @module
 */

import {
  cloneElement,
  forwardRef,
  Fragment,
  isValidElement,
  type NamedExoticComponent,
  type RefAttributes,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  ElementBox,
  ElementHandle,
  KitFocusEvent,
  KitMouseEvent,
  TooltipPlacement,
  TooltipProps as WebTooltipProps,
  WebStyle,
} from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import {
  Box,
  elementWindowScope,
  isElementFocusVisible,
  measureElement,
  measurePositionedOrigin,
  observeElementViewport,
  readElementViewport,
  useElementLayoutEffect,
} from '@molecule/app-ui-react/elements'
import { OverlayPortal, useOverlayLayer } from '@molecule/app-ui-react/platform'

import { isReactNode } from '../utilities/isReactNode.js'
import { mergeRefs } from '../utilities/mergeRefs.js'
import { rootProps } from '../utilities/rootProps.js'

interface Position {
  top: number
  left: number
}

type TooltipComponent = NamedExoticComponent<WebTooltipProps & RefAttributes<ElementHandle>>

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

// One active or pending tooltip per renderer window.
const activeTooltips = new WeakMap<object, () => void>()

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
function getArrowStyle(placement: TooltipPlacement): WebStyle {
  const half = ARROW_SIZE / 2
  const base: WebStyle = {
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

/**
 * Calculate tooltip position based on trigger element and placement.
 * @param triggerRect - The bounding rectangle of the trigger element.
 * @param tooltipRect - The bounding rectangle of the tooltip element.
 * @param placement - The desired tooltip placement direction.
 * @param offset - The pixel offset from the trigger element.
 * @returns The computed top and left position.
 */
function calculatePosition(
  triggerRect: ElementBox,
  tooltipRect: ElementBox,
  placement: TooltipPlacement,
  offset = 8,
): Position {
  const { x: left, y: top, width, height } = triggerRect
  const tooltipWidth = tooltipRect.width
  const tooltipHeight = tooltipRect.height

  const positions: Record<TooltipPlacement, Position> = {
    top: {
      top: top - tooltipHeight - offset,
      left: left + width / 2 - tooltipWidth / 2,
    },
    bottom: {
      top: top + height + offset,
      left: left + width / 2 - tooltipWidth / 2,
    },
    left: {
      top: top + height / 2 - tooltipHeight / 2,
      left: left - tooltipWidth - offset,
    },
    right: {
      top: top + height / 2 - tooltipHeight / 2,
      left: left + width + offset,
    },
    'top-start': {
      top: top - tooltipHeight - offset,
      left,
    },
    'top-end': {
      top: top - tooltipHeight - offset,
      left: left + width - tooltipWidth,
    },
    'bottom-start': {
      top: top + height + offset,
      left,
    },
    'bottom-end': {
      top: top + height + offset,
      left: left + width - tooltipWidth,
    },
  }

  return positions[placement]
}

/** Keeps a positioned edge inside the visible viewport, including an oversized tooltip. */
function clampEdge(value: number, viewportSize: number, surfaceSize: number): number {
  const margin = 8
  return Math.min(Math.max(value, margin), Math.max(margin, viewportSize - surfaceSize - margin))
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
 * edge. Entering another tooltip trigger immediately dismisses the previous
 * tooltip, including any pending delayed show.
 */
export const Tooltip: TooltipComponent = forwardRef<ElementHandle, WebTooltipProps>(
  (
    {
      content,
      children,
      placement = 'top',
      delay = 0,
      hasArrow = false,
      className,
      style,
      testId,
      ...rest
    },
    ref,
  ) => {
    const [isVisible, setIsVisible] = useState(false)
    const [inDeviceWindow, setInDeviceWindow] = useState(false)
    const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
    const committedPosition = useRef(position)
    const triggerRef = useRef<ElementHandle>(null)
    const tooltipRef = useRef<ElementHandle>(null)
    const positionedRef = useRef<ElementHandle>(null)
    const [surface, setSurface] = useState<ElementHandle | null>(null)
    const activeWindow = useRef<object | undefined>(undefined)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // Programmatically associates the tooltip with its trigger. A previous
    // version relied on the WRAPPER div's hover/focus — but the wrapper is
    // not itself the focused element, so its `aria-describedby` would never
    // be announced for the child that actually receives focus (see the
    // single-child cloning below).
    // A caller's `id` names the tooltip box, so the association points at it.
    const generatedId = useId()
    const tooltipId = rest.id ?? generatedId
    const setTooltipRef = useMemo(() => mergeRefs(ref, tooltipRef, setSurface), [ref])

    const cm = getClassMap()

    const release = useCallback((owner: () => void): void => {
      clearTimeout(timeoutRef.current)
      clearTimeout(hideTimeoutRef.current)
      const scope = activeWindow.current
      if (scope && activeTooltips.get(scope) === owner) activeTooltips.delete(scope)
      activeWindow.current = undefined
    }, [])

    const hide = useCallback((): void => {
      release(hide)
      setIsVisible(false)
    }, [release])

    const layer = useOverlayLayer({
      open: isVisible,
      kind: 'tooltip',
      surface: tooltipRef,
      anchor: triggerRef,
      dismissKey: true,
      onDismiss: hide,
    })

    const show = useCallback(() => {
      const trigger = triggerRef.current
      if (!trigger) return
      const scope = elementWindowScope(trigger)
      release(hide)
      activeTooltips.get(scope)?.()
      // Claim before scheduling so another trigger also cancels pending shows.
      activeTooltips.set(scope, hide)
      activeWindow.current = scope
      setInDeviceWindow(readElementViewport(trigger)?.scrollOwner === 'element')
      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true)
        }, delay)
      } else {
        setIsVisible(true)
      }
    }, [delay, hide, release])

    // Allow the pointer to cross the placement gap into the tooltip itself.
    const scheduleHide = useCallback(() => {
      clearTimeout(timeoutRef.current)
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = setTimeout(hide, 150)
    }, [hide])

    const keepVisible = useCallback(() => {
      clearTimeout(hideTimeoutRef.current)
    }, [])

    // Show on focus ONLY for keyboard focus (:focus-visible). A mouse click or a
    // programmatic .focus() — e.g. a dropdown/menu returning focus to its trigger
    // after it closes — must NOT re-show a tooltip the click was meant to dismiss
    // (which is why the "Device frame" tooltip lingered after opening + selecting).
    const handleFocus = useCallback(
      (event: KitFocusEvent) => {
        if (isElementFocusVisible(event)) show()
      },
      [show],
    )

    const handleLongPress = useCallback(
      (event: KitMouseEvent): void => {
        const trigger = triggerRef.current
        if (trigger && readElementViewport(trigger)?.scrollOwner === 'element') {
          event.preventDefault()
          show()
        }
      },
      [show],
    )

    useElementLayoutEffect(() => {
      committedPosition.current = position
    }, [position])

    useElementLayoutEffect(() => {
      const anchor = triggerRef.current
      const positioned = positionedRef.current
      if (!isVisible || !anchor || !surface || !positioned) return
      let generation = 0
      const stop = observeElementViewport(anchor, (viewport) => {
        const sample = ++generation
        measureElement(anchor, (anchorBox) => {
          if (sample !== generation) return
          measureElement(surface, (tooltipBox) => {
            if (sample !== generation) return
            const { left, top } = calculatePosition(anchorBox, tooltipBox, placement)
            const x = clampEdge(left, viewport.width, tooltipBox.width)
            const y = clampEdge(top, viewport.contentHeight, tooltipBox.height)
            measurePositionedOrigin(positioned, committedPosition.current, (origin) => {
              if (sample !== generation) return
              const next = { left: x - origin.x, top: y - origin.y }
              setPosition((previous) =>
                previous.left === next.left && previous.top === next.top ? previous : next,
              )
            })
          })
        })
      })
      return () => {
        generation++
        stop()
      }
    }, [content, isVisible, placement, surface])

    useEffect(() => () => release(hide), [hide, release])

    // Outer positioned wrapper carries the top/left/zIndex placement; the
    // arrow renders as its SIBLING (not nested inside the visible box),
    // because `tooltipContent` sets `overflow-hidden` — an arrow meant to
    // poke past the box's own edge would be clipped invisible if it were a
    // descendant of that element instead.
    const tooltipElement = isVisible && (
      <Box
        as="div"
        accessibilityGroup={false}
        ref={positionedRef}
        style={{ position: 'absolute', top: position.top, left: position.left, zIndex: 9999 }}
        onMouseEnter={keepVisible}
        onMouseLeave={scheduleHide}
        onPressOutside={inDeviceWindow ? hide : undefined}
      >
        {/* The box carries every declared prop: className, style, testId, the forwarded ref,
            and the rest (title, aria-*, data-*, automationId as data-mol-id, handlers). */}
        <Box
          as="div"
          ref={setTooltipRef}
          role="tooltip"
          className={cm.cn(cm.tooltipContent, className)}
          webStyle={style}
          data-testid={testId}
          {...rootProps(rest)}
          id={tooltipId}
        >
          {isReactNode(content) ? content : null}
        </Box>
        {hasArrow && (
          <Box
            as="span"
            aria-hidden="true"
            className={inDeviceWindow ? cm.cn(cm.surface, cm.borderAll) : undefined}
            webStyle={getArrowStyle(placement)}
          />
        )}
      </Box>
    )

    // Single-child API (mirrors every mainstream tooltip library): when
    // `children` is exactly one valid element, clone it to inject
    // `aria-describedby` onto the actual focused/hovered node while the
    // tooltip is visible. A string, fragment, or list of nodes has no single
    // element to associate with the tooltip.
    const triggerContent = isReactNode(children) ? children : null
    const describedChildren =
      isValidElement<{ 'aria-describedby'?: string }>(triggerContent) &&
      triggerContent.type !== Fragment
        ? cloneElement(triggerContent, {
            'aria-describedby': isVisible ? tooltipId : undefined,
          })
        : triggerContent

    return (
      <>
        {/* The wrapper is not a control: it listens for the events that bubble
            up from the control inside it (hover, focus, Escape, a click), so it
            is a presentation element and the control keeps its own role. */}
        <Box
          as="div"
          accessibilityGroup={false}
          ref={triggerRef}
          role="presentation"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          onFocus={handleFocus}
          onBlur={hide}
          onContextMenu={handleLongPress}
          onTouchStart={inDeviceWindow ? hide : undefined}
          // The overlay layer handles a visible tooltip. This also cancels a delayed show.
          onKeyDown={(event) => {
            if (!isVisible && event.key === 'Escape') hide()
          }}
          // Any click on a tooltip-wrapped control hides the tooltip — clicking a
          // button shouldn't leave its hover/focus tooltip lingering. The wrapper
          // wraps children directly, so this single handler covers every
          // button-with-tooltip consumer.
          onClick={hide}
          className={cm.tooltipTrigger}
        >
          {describedChildren}
        </Box>
        {tooltipElement && (
          <OverlayPortal layer={layer} presentation="host" server="omit">
            {tooltipElement}
          </OverlayPortal>
        )}
      </>
    )
  },
)

Tooltip.displayName = 'Tooltip'
