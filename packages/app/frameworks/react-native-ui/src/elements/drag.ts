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
  ElementZoom,
  InteractionProps,
  KitModifierKeys,
} from '@molecule/app-ui'

import { type DragModifiers, useDragModifiers } from './dragModifiers.js'
import { mouseEvent } from './events.js'

type FrameHost = Pick<View, 'measure' | 'measureInWindow'>
type FrameRef = RefObject<FrameHost | null>
type Frame = { rootX: number; rootY: number; bounds: ElementBox }
type Contact = Pick<
  NativeTouchEvent,
  'identifier' | 'pageX' | 'pageY' | 'locationX' | 'locationY' | 'timestamp'
>
type Pinch = {
  contacts: Map<Contact['identifier'], Contact>
  previous?: { at: Point; distance: number }
}
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
  zoom?: ElementZoom
  modifiers?: DragModifiers
  secondary?: BoxProps['secondaryAction']
  press?: PressHandlers
}
type Responder = Pick<
  ViewProps,
  | 'onStartShouldSetResponder'
  | 'onResponderGrant'
  | 'onResponderStart'
  | 'onResponderMove'
  | 'onResponderEnd'
  | 'onResponderRelease'
  | 'onResponderTerminate'
  | 'onResponderTerminationRequest'
  | 'onLayout'
  | 'onPointerDownCapture'
  | 'onPointerMoveCapture'
  | 'onPointerUpCapture'
>
type Session = {
  down: Contact
  timer?: ReturnType<typeof setTimeout>
  acquired: boolean
  moved: boolean
  fromPinch: boolean
  yielded: boolean
  longPressed: boolean
  axisChosen: boolean
  origin?: Point
  downModifiers?: KitModifierKeys
  pinch?: Pinch
  lift?: () => void
  last?: ElementDragPoint
}
type Delivery = { ready: boolean; send(): void }

const NO_MODIFIERS: KitModifierKeys = {
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
}
const TOUCH_SLOP = 8
const LONG_PRESS_MS = 500
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_RADIUS = 24

/** The viewport and pointer stream shared by the shapes in a native SVG canvas. */
export const SvgDragScope = createContext<{ frame: FrameRef; modifiers: DragModifiers } | null>(
  null,
)

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

/** Copies native contact data before React Native can reuse the event. */
function snapshot(touch: NativeTouchEvent): Contact | undefined {
  const { identifier, pageX, pageY, locationX, locationY, timestamp } = touch
  if (!Number.isFinite(pageX) || !Number.isFinite(pageY)) return undefined
  return { identifier, pageX, pageY, locationX, locationY, timestamp }
}

/** Reads the touches changed in this notification. */
function changedTouches({ nativeEvent }: GestureResponderEvent): NativeTouchEvent[] {
  return nativeEvent.changedTouches?.length ? nativeEvent.changedTouches : [nativeEvent]
}

/** Looks up the active contact in a responder update. */
function changed(event: GestureResponderEvent, id?: Contact['identifier']): Contact | undefined {
  const touches = changedTouches(event)
  const touch = id === undefined ? touches[0] : touches.find((item) => item.identifier === id)
  return touch && snapshot(touch)
}

/** Converts a touch root coordinate to a point in the window. */
function windowPoint(contact: Contact, frame: Frame): Point {
  return {
    x: contact.pageX - frame.rootX + frame.bounds.x,
    y: contact.pageY - frame.rootY + frame.bounds.y,
  }
}

/** Describes the contact relative to the host and to the drag origin. */
function sample(
  contact: Contact,
  frame: Frame,
  origin: Point,
  modifiers: KitModifierKeys = NO_MODIFIERS,
): ElementDragPoint {
  const position = windowPoint(contact, frame)
  return {
    x: position.x - frame.bounds.x,
    y: position.y - frame.bounds.y,
    dx: position.x - origin.x,
    dy: position.y - origin.y,
    bounds: frame.bounds,
    ...modifiers,
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
  const localModifiers = useDragModifiers()
  const modifiers = options.modifiers ?? localModifiers
  const hasZoom = options.zoom !== undefined
  const enabled = hasDrag || hasZoom || options.secondary !== undefined

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
    [enabled, hasDrag, hasZoom, frame],
  )

  if (!enabled) return undefined

  /** Delivers responder updates in order even when measurement completes out of order. */
  function enqueue(
    send: (bounds: Frame | null) => void,
    host?: FrameHost,
    waitForPointer?: (ready: () => void) => void,
  ): void {
    const queue = pending.current
    let measured: Frame | null | undefined
    let pointerReady = !waitForPointer
    const delivery = {
      ready: false,
      send() {
        const bounds = measured ?? cache.current
        if (measured) cache.current = measured
        send(bounds)
      },
    }
    queue.push(delivery)
    const drain = (): void => {
      if (pending.current !== queue) return
      delivery.ready = measured !== undefined && pointerReady
      // A fast release can arrive before the first bridge measurement. Deliver in touch order.
      while (queue[0]?.ready && pending.current === queue) queue.shift()?.send()
    }
    const ready = (bounds: Frame | null): void => {
      measured = bounds
      drain()
    }
    waitForPointer?.(() => {
      pointerReady = true
      drain()
    })
    if (host) measureFrame(host, ready)
    else ready(null)
  }

  /** Dispatches the drag phase using the measured host frame. */
  function deliver(current: Session, contact: Contact, phase: 'start' | 'move' | 'end'): void {
    let keys = modifiers.read(contact, phase)
    const waitForPointer =
      !keys && Number.isFinite(contact.timestamp)
        ? (ready: () => void): void =>
            queueMicrotask(() => {
              keys = modifiers.read(contact, phase)
              ready()
            })
        : undefined
    enqueue(
      (bounds) => {
        const drag = latest.current.drag
        if (phase === 'start') current.downModifiers = keys
        if (!bounds || !drag) return
        if (!current.origin) {
          current.origin = windowPoint(current.down, bounds)
          current.last = sample(current.down, bounds, current.origin, current.downModifiers)
          started.current = current
          drag.onStart(current.last)
        }
        if (phase === 'start' || started.current !== current) return
        const previous = current.last
        const next = sample(contact, bounds, current.origin, keys)
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
          previous.bounds.height !== next.bounds.height ||
          previous.altKey !== next.altKey ||
          previous.ctrlKey !== next.ctrlKey ||
          previous.metaKey !== next.metaKey ||
          previous.shiftKey !== next.shiftKey
        ) {
          drag.onMove?.(next)
        }
      },
      frame?.current ?? undefined,
      waitForPointer,
    )
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
  function cancel(current: Session, takenOver = false): void {
    enqueue(() => {
      if (started.current !== current) return
      started.current = null
      const drag = latest.current.drag
      if (current.last) (drag?.onCancel ?? (takenOver ? drag?.onEnd : undefined))?.(current.last)
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
        if (
          contact &&
          !current.fromPinch &&
          !current.moved &&
          !current.yielded &&
          !current.longPressed
        )
          tap(contact, event, at)
      })
    }
  }

  /** Queues the pair in touch order, using the outer frame of that sample. */
  function pair(pinch: Pinch, rebase: boolean): void {
    const [first, second] = pinch.contacts.values()
    if (!first || !second) return
    enqueue((bounds) => {
      if (!bounds) {
        pinch.previous = undefined
        return
      }
      const at = {
        x: (first.pageX + second.pageX) / 2 - bounds.rootX,
        y: (first.pageY + second.pageY) / 2 - bounds.rootY,
      }
      const distance = Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY)
      const previous = pinch.previous
      pinch.previous = { at, distance }
      if (rebase || !previous || !(previous.distance > 0) || !(distance > 0)) return
      const factor = distance / previous.distance
      if (factor !== 1 || previous.at.x !== at.x || previous.at.y !== at.y) {
        latest.current.zoom?.onZoom({ kind: 'pinch', from: previous.at, at, factor })
      }
    }, frame?.current ?? undefined)
  }

  /** Refreshes the positions of contacts already accepted by this responder. */
  function updateContacts(pinch: Pinch, touches: NativeTouchEvent[]): void {
    for (const touch of touches) {
      const point = snapshot(touch)
      if (point && pinch.contacts.has(point.identifier)) pinch.contacts.set(point.identifier, point)
    }
  }

  /** Starts a one-contact session, including a new drag after a pinch. */
  function begin(down: Contact, pinch?: Pinch, event?: GestureResponderEvent): Session {
    const { drag, press } = latest.current
    const longPress = drag?.touchStart === 'longPress'
    const both = drag?.axis !== 'horizontal' && drag?.axis !== 'vertical'
    const current: Session = {
      down,
      pinch,
      acquired: false,
      moved: false,
      fromPinch: !event,
      yielded: false,
      longPressed: false,
      axisChosen: Boolean(pinch) || both || longPress,
    }
    active.current = current
    if (event) press?.onPressIn?.(event)
    if (event && drag && !longPress) acquire(current)
    if (event && (longPress || press?.onLongPress)) {
      event.persist()
      current.timer = setTimeout(() => {
        if (active.current !== current || (current.pinch && current.pinch.contacts.size > 1)) return
        if (current.moved) return
        if (longPress) acquire(current)
        else {
          current.longPressed = true
          latest.current.press?.onLongPress?.(event)
        }
      }, LONG_PRESS_MS)
    }
    return current
  }

  /** Retires released contacts and establishes a basis for the pair or finger that remains. */
  function lift(current: Session, pinch: Pinch, ended: Contact['identifier'][]): void {
    const [first, second] = pinch.contacts.keys()
    for (const id of ended) pinch.contacts.delete(id)
    if (
      second === undefined ||
      !(ended.includes(second) || (first !== undefined && ended.includes(first)))
    ) {
      return
    }
    const [remaining] = pinch.contacts.values()
    if (pinch.contacts.size >= 2) pair(pinch, true)
    else if (remaining) begin(remaining, pinch)
  }

  return {
    onStartShouldSetResponder: () => active.current === null,
    onResponderGrant(event) {
      const down = changed(event)
      if (!down || active.current) return false
      const { drag, zoom } = latest.current
      const pinch = zoom ? { contacts: new Map([[down.identifier, down]]) } : undefined
      const current = begin(down, pinch, event)
      // Reserve the opted-in touch plane from native scroll interception. Other drags
      // retain their existing axis and long-press negotiation.
      return Boolean(zoom || (drag && drag.touchStart !== 'longPress' && current.axisChosen))
    },
    onResponderStart(event) {
      active.current?.lift?.()
      const current = active.current
      const pinch = current?.pinch
      if (!current || !pinch) return
      const before = pinch.contacts.size
      for (const touch of changedTouches(event)) {
        const contact = snapshot(touch)
        if (contact) pinch.contacts.set(contact.identifier, contact)
      }
      if (before >= 2 || pinch.contacts.size < 2) return
      updateContacts(pinch, event.nativeEvent.touches)
      clearTimeout(current.timer)
      current.moved = true
      lastTap.current = null
      if (current.acquired) {
        current.acquired = false
        cancel(current, true)
      }
      pair(pinch, true)
    },
    onResponderMove(event) {
      active.current?.lift?.()
      const current = active.current
      if (!current) return
      const pinch = current.pinch
      if (pinch) {
        updateContacts(pinch, event.nativeEvent.touches)
        if (pinch.contacts.size >= 2) {
          const [first, second] = pinch.contacts.keys()
          if (
            changedTouches(event).some(
              ({ identifier }) => identifier === first || identifier === second,
            )
          ) {
            pair(pinch, false)
          }
          return
        }
      }
      if (current.yielded || current.longPressed) return
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
      if (current.fromPinch && !current.acquired && latest.current.drag) acquire(current)
      if (current.acquired) deliver(current, contact, 'move')
    },
    onResponderEnd(event) {
      active.current?.lift?.()
      const current = active.current
      if (!current) return
      event.persist()
      const contact = changed(event, current.down.identifier)
      const pinch = current.pinch
      // RN emits responder-end immediately before terminate on cancellation. Let
      // that terminal event win, while preserving order before any later input.
      const retire = (): void => {
        if (active.current !== current || current.lift !== retire) return
        current.lift = undefined
        if (pinch && pinch.contacts.size >= 2) {
          updateContacts(pinch, event.nativeEvent.touches)
          lift(
            current,
            pinch,
            changedTouches(event).map(({ identifier }) => identifier),
          )
        } else if (contact) finish(current, contact, event)
      }
      current.lift = retire
      queueMicrotask(retire)
    },
    onResponderRelease(event) {
      const current = active.current
      if (current) finish(current, changed(event, current.down.identifier), event)
    },
    onResponderTerminate(event) {
      const current = active.current
      if (current) finish(current, undefined, event)
    },
    onResponderTerminationRequest: () => {
      const current = active.current
      return !current || (!current.pinch && (!current.acquired || !current.axisChosen))
    },
    ...(hasDrag && !options.modifiers ? modifiers.handlers : undefined),
    onLayout() {
      cache.current = null
    },
  }
}
