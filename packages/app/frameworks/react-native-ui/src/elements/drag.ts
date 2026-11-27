import {
  createContext,
  type RefCallback,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import type {
  GestureResponderEvent,
  NativeTouchEvent,
  PressableProps,
  View,
  ViewProps,
} from 'react-native'

import type {
  BoxProps,
  ElementBox,
  ElementDrag,
  ElementDragPoint,
  InteractionProps,
} from '@molecule/app-ui'

import { mouseEvent } from './events.js'

type FrameHost = Pick<View, 'measure' | 'measureInWindow'>
type FrameRef = RefObject<FrameHost | null>
type Frame = { rootX: number; rootY: number; bounds: ElementBox }
type Contact = Pick<NativeTouchEvent, 'identifier' | 'pageX' | 'pageY'>
type Point = { x: number; y: number }

type PressHandlers = Pick<PressableProps, 'onPress' | 'onPressIn' | 'onPressOut' | 'onLongPress'>
type AccessiblePressHandlers = Pick<
  PressableProps,
  | 'onFocus'
  | 'onBlur'
  | 'focusable'
  | 'onPointerDown'
  | 'accessibilityActions'
  | 'onAccessibilityAction'
>
type Options = {
  drag?: ElementDrag
  secondary?: BoxProps['secondaryAction']
  press?: PressHandlers
}
type Responder = Pick<
  ViewProps,
  | 'onStartShouldSetResponder'
  | 'onResponderGrant'
  | 'onResponderMove'
  | 'onResponderEnd'
  | 'onResponderRelease'
  | 'onResponderTerminate'
  | 'onResponderTerminationRequest'
  | 'onLayout'
>
type Session = {
  down: Contact
  timer?: ReturnType<typeof setTimeout>
  acquired: boolean
  moved: boolean
  yielded: boolean
  longPressed: boolean
  axisChosen: boolean
  origin?: Point
  last?: ElementDragPoint
}
type Delivery = { ready: boolean; send(): void }

const TOUCH_SLOP = 8
const LONG_PRESS_MS = 500
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_RADIUS = 24

/** The viewport frame shared by the shapes in the nearest native SVG canvas. */
export const SvgDragFrame = createContext<FrameRef | null>(null)

/** Lets a descendant with a secondary tap action negotiate its ancestor's long-press drag. */
export const LongPressDragScope = createContext<{ frame: FrameRef; drag: ElementDrag } | null>(null)

/**
 * Preserves hover, focus and assistive activation when a View owns the touch responder.
 *
 * @param props - The element's hover callbacks.
 * @param press - The press interaction's focus and assistive actions.
 * @param activate - The primary assistive activation, if present.
 * @param secondary - The localized secondary action, if present.
 * @returns Props for the same View that owns the drag.
 */
export function dragViewActions(
  props: InteractionProps,
  press: AccessiblePressHandlers,
  activate?: () => void,
  secondary?: BoxProps['secondaryAction'],
): ViewProps & Pick<PressableProps, 'onFocus' | 'onBlur'> {
  const actions = press.accessibilityActions ?? []
  const hasActivate = actions.some(({ name }) => name === 'activate')
  return {
    focusable: press.focusable,
    onFocus: press.onFocus,
    onBlur: press.onBlur,
    onPointerDown: press.onPointerDown,
    onPointerEnter: props.onMouseEnter
      ? (event) => {
          if (event.nativeEvent.pointerType !== 'touch') props.onMouseEnter?.(mouseEvent(event))
        }
      : undefined,
    onPointerLeave: props.onMouseLeave
      ? (event) => {
          if (event.nativeEvent.pointerType !== 'touch') props.onMouseLeave?.(mouseEvent(event))
        }
      : undefined,
    onAccessibilityTap: activate,
    accessibilityActions:
      activate || secondary || actions.length
        ? [
            ...actions,
            ...(activate && !hasActivate ? [{ name: 'activate' }] : []),
            ...(secondary ? [{ name: 'secondaryAction', label: secondary.label }] : []),
          ]
        : undefined,
    onAccessibilityAction(event) {
      const { actionName } = event.nativeEvent
      if (actionName === 'activate' && activate) activate()
      else if (actionName === 'secondaryAction') secondary?.run()
      else press.onAccessibilityAction?.(event)
    },
  }
}

/**
 * Retains a measurable host and forwards the original ref to its caller.
 *
 * @param forward - The caller's host ref.
 * @returns The frame ref and the callback to attach to the host.
 */
export function useDragFrame(
  forward?: RefCallback<View>,
): [RefObject<View | null>, RefCallback<View>] {
  const frame = useRef<View>(null)
  const attach = useCallback(
    (host: View | null) => {
      frame.current = host
      forward?.(host)
    },
    [forward],
  )
  return [frame, attach]
}

/** Pairs the touch root with the host bounds in screen coordinates. */
function measureFrame(host: FrameHost, receive: (frame: Frame | null) => void): void {
  let root: Point | null | undefined
  let bounds: ElementBox | null | undefined
  const finish = (): void => {
    if (root === undefined || bounds === undefined) return
    receive(root && bounds ? { rootX: root.x, rootY: root.y, bounds } : null)
  }
  // Responder page coordinates and measure's page coordinates both use the touch root.
  // Pair that measurement with the window frame to account for modal and embedded roots.
  host.measure((_x, _y, _width, _height, pageX, pageY) => {
    root = Number.isFinite(pageX) && Number.isFinite(pageY) ? { x: pageX, y: pageY } : null
    finish()
  })
  host.measureInWindow((x, y, width, height) => {
    bounds = [x, y, width, height].every(Number.isFinite) ? { x, y, width, height } : null
    finish()
  })
}

/** Looks up the active contact in a responder update. */
function changed(event: GestureResponderEvent, id?: string): Contact | undefined {
  const { nativeEvent } = event
  const touches = nativeEvent.changedTouches?.length ? nativeEvent.changedTouches : [nativeEvent]
  const touch = id === undefined ? touches[0] : touches.find((item) => item.identifier === id)
  if (!touch || !Number.isFinite(touch.pageX) || !Number.isFinite(touch.pageY)) return undefined
  const { identifier, pageX, pageY } = touch
  return { identifier, pageX, pageY }
}

/** Converts a touch root coordinate to a point in the window. */
function windowPoint(contact: Contact, frame: Frame): Point {
  return {
    x: contact.pageX - frame.rootX + frame.bounds.x,
    y: contact.pageY - frame.rootY + frame.bounds.y,
  }
}

/** Describes the contact relative to the host and to the drag origin. */
function sample(contact: Contact, frame: Frame, origin: Point): ElementDragPoint {
  const position = windowPoint(contact, frame)
  return {
    x: position.x - frame.bounds.x,
    y: position.y - frame.bounds.y,
    dx: position.x - origin.x,
    dy: position.y - origin.y,
    bounds: frame.bounds,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  }
}

/**
 * Owns contact, tap and drag through one native gesture responder on a View or SVG shape.
 *
 * @param frame - The receiving View, or the enclosing SVG viewport.
 * @param options - The drag and tap behavior to dispatch.
 * @returns Responder props, or undefined when ordinary pressability should own the host.
 */
export function useNativeDrag(frame: FrameRef | null, options: Options): Responder | undefined {
  const latest = useRef(options)
  const active = useRef<Session>(null)
  const started = useRef<Session>(null)
  const cache = useRef<Frame>(null)
  const pending = useRef<Delivery[]>([])
  const lastTap = useRef<{ contact: Contact; at: number }>(null)
  const hasDrag = options.drag !== undefined
  const enabled = hasDrag || options.secondary !== undefined

  useLayoutEffect(() => {
    latest.current = options
  })
  useLayoutEffect(
    () => () => {
      const current = active.current
      active.current = null
      const last = started.current?.last
      started.current = null
      cache.current = null
      lastTap.current = null
      pending.current = []
      clearTimeout(current?.timer)
      if (last) latest.current.drag?.onCancel?.(last)
    },
    [enabled, hasDrag, frame],
  )

  if (!enabled) return undefined

  /** Delivers responder updates in order even when measurement completes out of order. */
  function enqueue(send: (bounds: Frame | null) => void, host?: FrameHost): void {
    const queue = pending.current
    let measured: Frame | null = null
    const delivery = {
      ready: false,
      send() {
        const bounds = measured ?? cache.current
        if (measured) cache.current = measured
        send(bounds)
      },
    }
    queue.push(delivery)
    const ready = (bounds: Frame | null): void => {
      if (pending.current !== queue) return
      measured = bounds
      delivery.ready = true
      // A fast release can arrive before the first bridge measurement. Deliver in touch order.
      while (queue[0]?.ready && pending.current === queue) queue.shift()?.send()
    }
    if (host) measureFrame(host, ready)
    else ready(null)
  }

  /** Dispatches the drag phase using the measured host frame. */
  function deliver(current: Session, contact: Contact, phase: 'start' | 'move' | 'end'): void {
    enqueue((bounds) => {
      const drag = latest.current.drag
      if (!bounds || !drag) return
      if (!current.origin) {
        current.origin = windowPoint(current.down, bounds)
        current.last = sample(current.down, bounds, current.origin)
        started.current = current
        drag.onStart(current.last)
      }
      if (phase === 'start' || started.current !== current) return
      const previous = current.last
      const next = sample(contact, bounds, current.origin)
      current.last = next
      if (phase === 'end') {
        started.current = null
        drag.onEnd?.(next)
      } else if (
        previous?.x !== next.x ||
        previous.y !== next.y ||
        previous.dx !== next.dx ||
        previous.dy !== next.dy ||
        previous.bounds.width !== next.bounds.width ||
        previous.bounds.height !== next.bounds.height
      ) {
        drag.onMove?.(next)
      }
    }, frame?.current ?? undefined)
  }

  /** Records that this contact crossed the drag threshold. */
  function acquire(current: Session): void {
    current.acquired = true
    deliver(current, current.down, 'start')
  }

  /** Activates an ordinary press or recognizes a second tap. */
  function tap(contact: Contact, event: GestureResponderEvent, at: number): void {
    const { secondary, press } = latest.current
    const previous = lastTap.current
    if (
      secondary &&
      previous &&
      at - previous.at <= DOUBLE_TAP_MS &&
      Math.hypot(contact.pageX - previous.contact.pageX, contact.pageY - previous.contact.pageY) <=
        DOUBLE_TAP_RADIUS
    ) {
      lastTap.current = null
      secondary.run()
    } else {
      lastTap.current = secondary ? { contact, at } : null
      press?.onPress?.(event)
    }
  }

  /** Cancels the active drag after already queued updates are delivered. */
  function cancel(current: Session): void {
    enqueue(() => {
      if (started.current !== current) return
      started.current = null
      if (current.last) latest.current.drag?.onCancel?.(current.last)
    })
  }

  /** Ends contact and dispatches the terminal gesture and press callbacks. */
  function finish(current: Session, contact?: Contact, event?: GestureResponderEvent): void {
    if (active.current !== current) return
    active.current = null
    clearTimeout(current.timer)
    if (current.acquired) {
      if (contact && !current.yielded && !current.longPressed) deliver(current, contact, 'end')
      else cancel(current)
    }
    if (event) {
      event.persist()
      const at = Date.now()
      enqueue(() => {
        latest.current.press?.onPressOut?.(event)
        if (contact && !current.moved && !current.yielded && !current.longPressed)
          tap(contact, event, at)
      })
    }
  }

  return {
    onStartShouldSetResponder: () => active.current === null,
    onResponderGrant(event) {
      const down = changed(event)
      if (!down || active.current) return
      const { drag, press } = latest.current
      const longPress = drag?.touchStart === 'longPress'
      const both = drag?.axis !== 'horizontal' && drag?.axis !== 'vertical'
      const current: Session = {
        down,
        acquired: false,
        moved: false,
        yielded: false,
        longPressed: false,
        axisChosen: both || longPress,
      }
      active.current = current
      press?.onPressIn?.(event)
      if (drag && !longPress) acquire(current)
      if (longPress || press?.onLongPress) {
        event.persist()
        current.timer = setTimeout(() => {
          if (active.current !== current || current.moved) return
          if (longPress) acquire(current)
          else {
            current.longPressed = true
            latest.current.press?.onLongPress?.(event)
          }
        }, LONG_PRESS_MS)
      }
      // On Android, returning true prevents native ancestors from taking an immediate two-axis drag.
      return Boolean(drag && !longPress && both)
    },
    onResponderMove(event) {
      const current = active.current
      if (!current || current.yielded || current.longPressed) return
      const contact = changed(event, current.down.identifier)
      if (!contact) return
      const dx = Math.abs(contact.pageX - current.down.pageX)
      const dy = Math.abs(contact.pageY - current.down.pageY)
      if (Math.max(dx, dy) > TOUCH_SLOP && !current.moved) {
        current.moved = true
        clearTimeout(current.timer)
        lastTap.current = null
        if (!current.axisChosen) {
          current.axisChosen = true
          const perpendicular = latest.current.drag?.axis === 'horizontal' ? dy > dx : dx > dy
          if (perpendicular) {
            current.yielded = true
            if (current.acquired) {
              current.acquired = false
              cancel(current)
            }
          }
        }
      }
      if (current.acquired) deliver(current, contact, 'move')
    },
    onResponderEnd(event) {
      const current = active.current
      if (!current) return
      const contact = changed(event, current.down.identifier)
      if (!contact) return
      event.persist()
      // RN also emits responder-end just before a cancel/terminate. Wait for that dispatch.
      queueMicrotask(() => finish(current, contact, event))
    },
    onResponderRelease(event) {
      const current = active.current
      if (current) finish(current, changed(event, current.down.identifier), event)
    },
    onResponderTerminate(event) {
      const current = active.current
      if (current) finish(current, undefined, event)
    },
    onResponderTerminationRequest: () => !active.current?.acquired || !active.current.axisChosen,
    onLayout() {
      cache.current = null
    },
  }
}
