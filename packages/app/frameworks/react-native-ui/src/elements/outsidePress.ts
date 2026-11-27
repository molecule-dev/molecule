/** Outside-touch dispatch in the enclosing native Box tree. */
import { createContext, useContext, useLayoutEffect, useMemo, useRef } from 'react'
import type { GestureResponderEvent, ViewProps } from 'react-native'

import type { ElementHandle, OverlayTarget } from '@molecule/app-ui'

type TouchHandler = NonNullable<ViewProps['onTouchStart']>
type OutsideSubscription = { dismiss(): void }
type TouchPath = {
  boxes: Set<OutsideSubscription>
  handles: Set<ElementHandle>
}
type OutsideBoundary = {
  listeners: Set<OutsideSubscription>
  paths: WeakMap<object, TouchPath>
}
type OutsideGesture = (inside: ReadonlySet<ElementHandle>) => (() => void) | undefined

/** Tracks subscribed boxes and the boxes on each touch's bubble path. */
function createBoundary(): OutsideBoundary {
  return {
    listeners: new Set<OutsideSubscription>(),
    paths: new WeakMap<object, TouchPath>(),
  }
}

/** The outer Box's outside-touch boundary. */
export const OutsidePressScope = createContext<OutsideBoundary | null>(null)

/** Adds an anchor or surface on the native touch's bubble path. */
export function useOutsideTouch(target: OverlayTarget): TouchHandler | undefined {
  const scope = useContext(OutsidePressScope)
  if (!scope) return
  return (event) => {
    if (target.current) pathFor(scope, event).handles.add(target.current)
  }
}

/** The same native event bubbles through the marked surfaces and the presentation root. */
function pathFor(scope: OutsideBoundary, event: GestureResponderEvent): TouchPath {
  const path = scope.paths.get(event.nativeEvent) ?? { boxes: new Set(), handles: new Set() }
  scope.paths.set(event.nativeEvent, path)
  return path
}

/** Dispatches ordinary outside-Box requests and returns the overlay boundaries in the path. */
function finish(scope: OutsideBoundary, event: GestureResponderEvent): ReadonlySet<ElementHandle> {
  const path = pathFor(scope, event)
  scope.paths.delete(event.nativeEvent)
  for (const listener of scope.listeners) {
    if (!path.boxes.has(listener)) listener.dismiss()
  }
  return path.handles
}

/** Makes every raw child touch observable without becoming its responder. */
export function useOutsidePressRoot(onGesture: OutsideGesture): {
  scope: OutsideBoundary
  handlers: Pick<ViewProps, 'onTouchStart' | 'onTouchEnd' | 'onTouchCancel'>
} {
  const scope = useMemo(createBoundary, [])
  const pending = useRef<
    | {
        identifier: string
        x: number
        y: number
        activate: () => void
      }
    | undefined
  >(undefined)
  return {
    scope,
    handlers: {
      onTouchStart(event) {
        pending.current = undefined
        const inside = finish(scope, event)
        const { identifier, pageX, pageY, touches } = event.nativeEvent
        if (touches.length !== 1) return
        const activate = onGesture(inside)
        if (activate) pending.current = { identifier, x: pageX, y: pageY, activate }
      },
      onTouchEnd(event) {
        const press = pending.current
        pending.current = undefined
        const { identifier, pageX, pageY } = event.nativeEvent
        if (press?.identifier === identifier && Math.hypot(press.x - pageX, press.y - pageY) <= 8) {
          press.activate()
        }
      },
      onTouchCancel() {
        pending.current = undefined
      },
    },
  }
}

/** Observes the touch bubble path without taking the responder from a child. */
export function useOutsidePress(
  dismiss: (() => void) | undefined,
  target?: OverlayTarget,
): {
  scope: OutsideBoundary
  onTouchStart: TouchHandler | undefined
} {
  const parent = useContext(OutsidePressScope)
  const scope = useMemo(() => parent ?? createBoundary(), [parent])
  const subscription = useMemo(() => (dismiss ? { dismiss } : undefined), [dismiss])
  useLayoutEffect(() => {
    if (!subscription) return
    scope.listeners.add(subscription)
    return () => {
      scope.listeners.delete(subscription)
    }
  }, [subscription, scope])
  const onTouchStart: TouchHandler | undefined =
    subscription || target || !parent
      ? (event) => {
          const path = pathFor(scope, event)
          if (subscription) path.boxes.add(subscription)
          if (target?.current) path.handles.add(target.current)
          if (!parent) finish(scope, event)
        }
      : undefined
  return { scope, onTouchStart }
}
