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
  ElementHandle,
  KitFocusEvent,
  KitMouseEvent,
  TooltipProps as WebTooltipProps,
} from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import {
  Box,
  elementWindowScope,
  isElementFocusVisible,
  readElementViewport,
} from '@molecule/app-ui-react/elements'
import {
  OverlayArrow,
  OverlayPortal,
  useAnchoredPosition,
  useOverlayLayer,
  useTooltipDescription,
} from '@molecule/app-ui-react/platform'

import { isReactNode } from '../utilities/isReactNode.js'
import { mergeRefs } from '../utilities/mergeRefs.js'
import { rootProps } from '../utilities/rootProps.js'

type TooltipComponent = NamedExoticComponent<WebTooltipProps & RefAttributes<ElementHandle>>

// One active or pending tooltip per renderer window.
const activeTooltips = new WeakMap<object, () => void>()

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
    const triggerRef = useRef<ElementHandle>(null)
    const tooltipRef = useRef<ElementHandle>(null)
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
      outside: inDeviceWindow ? { inside: [triggerRef, tooltipRef], phase: 'start' } : undefined,
      onDismiss: hide,
    })

    const position = useAnchoredPosition({
      layer,
      open: isVisible,
      anchor: triggerRef,
      surface,
      placement,
      offset: 8,
      padding: 8,
      collision: 'shift',
      timing: 'layout',
      contentKey: content,
    })

    const tooltipContent = isReactNode(content) ? content : null
    const hasPersistentDescription = useTooltipDescription(tooltipId, tooltipContent)

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
        style={{ position: 'absolute', top: position.top, left: position.left, zIndex: 9999 }}
        onMouseEnter={keepVisible}
        onMouseLeave={scheduleHide}
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
          {tooltipContent}
        </Box>
        {hasArrow && <OverlayArrow placement={position.placement} />}
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
            'aria-describedby':
              [
                triggerContent.props['aria-describedby'],
                (isVisible || hasPersistentDescription) && tooltipId,
              ]
                .filter(Boolean)
                .join(' ') || undefined,
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
          <OverlayPortal layer={layer} presentation="host" server="omit" anchorPosition={position}>
            {tooltipElement}
          </OverlayPortal>
        )}
      </>
    )
  },
)

Tooltip.displayName = 'Tooltip'
