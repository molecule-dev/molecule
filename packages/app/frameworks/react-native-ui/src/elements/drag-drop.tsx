/**
 * React Native drag gestures and accessible destination controls.
 *
 * @module
 */

import {
  createContext,
  type ReactElement,
  type ReactNode,
  type RefCallback,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { PanResponder, View } from 'react-native'

import type { DragEndEvent, DragStartEvent } from '@molecule/app-drag-drop'
import {
  type DragDropRenderer,
  DragDropRendererProvider,
  type DragMoveControls,
  type DragScopeProps,
  type DragSourceProps,
  type DragTargetProps,
  type ScopedDragSourceProps,
  type ScopedDragTargetProps,
} from '@molecule/app-drag-drop/react'
import type { ElementBox, ElementDrag, ElementDragPoint, ElementHandle } from '@molecule/app-ui'

import { measureElement } from './measure.js'
import { Pressable } from './Pressable.js'

type EndReason = NonNullable<DragEndEvent['reason']>
type TargetMeasure = (receive: (box: ElementBox) => void) => void
type Point = Pick<ElementBox, 'x' | 'y'>

interface MeasuredTarget extends ElementBox {
  id: string
  measure: TargetMeasure
}

interface ActiveGesture {
  token: DragStartEvent
  over?: MeasuredTarget
  positions?: MeasuredTarget[]
  pending: Point[]
  ending?: EndReason
}

interface GestureScope {
  register: (id: string, measure: TargetMeasure) => () => void
  begin: (source: DragStartEvent) => DragStartEvent
  hover: (token: DragStartEvent, x: number, y: number) => void
  release: (token: DragStartEvent, x: number, y: number) => void
  cancel: (token: DragStartEvent, reason?: 'cancel' | 'unmount') => void
  activate: (source: DragStartEvent, targetId: string) => void
}

const ScopeContext = createContext<GestureScope | null>(null)
const DRAG_THRESHOLD = 8
const MEASUREMENT_TIMEOUT_MS = 250

/** Measures a snapshot of the targets registered to the current gesture scope. */
function measureTargets(targets: Map<string, TargetMeasure>): Promise<MeasuredTarget[]> {
  return new Promise((resolve) => {
    const views = [...targets]
    const positions: MeasuredTarget[] = []
    let pending = views.length
    if (!pending) {
      resolve(positions)
      return
    }
    // An unmounted view may never call back. Finish with the views that still measured.
    const timeout = setTimeout(() => resolve([...positions]), MEASUREMENT_TIMEOUT_MS)
    for (const [id, measure] of views) {
      measure((box) => {
        if (box.width > 0 && box.height > 0) positions.push({ ...box, id, measure })
        pending--
        if (!pending) {
          clearTimeout(timeout)
          resolve(positions)
        }
      })
    }
  })
}

/** Finds a mounted target in the current scope whose measured bounds contain the position. */
function targetAt(
  targets: Map<string, TargetMeasure>,
  positions: MeasuredTarget[],
  x: number,
  y: number,
): MeasuredTarget | undefined {
  return positions.find(
    (position) =>
      targets.get(position.id) === position.measure &&
      x >= position.x &&
      x < position.x + position.width &&
      y >= position.y &&
      y < position.y + position.height,
  )
}

/** Bounds each drag gesture and the target registry to one feature instance. */
function DragScope({
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  retainTarget = false,
}: DragScopeProps & { retainTarget?: boolean }): ReactElement {
  const handlers = useRef({ onDragStart, onDragMove, onDragEnd })
  const active = useRef<ActiveGesture | null>(null)
  useLayoutEffect(() => {
    handlers.current = { onDragStart, onDragMove, onDragEnd }
  }, [onDragStart, onDragMove, onDragEnd])

  const scope = useMemo<GestureScope>(() => {
    const targets = new Map<string, TargetMeasure>()
    const end = (gesture: ActiveGesture, reason: EndReason, target?: MeasuredTarget): void => {
      if (active.current !== gesture) return
      active.current = null
      const over = target ?? (retainTarget && reason !== 'unmount' ? gesture.over : undefined)
      const overId = over && targets.get(over.id) === over.measure ? over.id : undefined
      handlers.current.onDragEnd?.({ ...gesture.token, overId, reason })
    }
    const visit = (gesture: ActiveGesture, positions: MeasuredTarget[], { x, y }: Point): void => {
      const over = targetAt(targets, positions, x, y)
      if ((!over && retainTarget) || over?.measure === gesture.over?.measure) return
      gesture.over = over
      handlers.current.onDragMove?.({ ...gesture.token, overId: over?.id })
    }
    return {
      register: (id, measure) => {
        targets.set(id, measure)
        return () => {
          if (targets.get(id) === measure) targets.delete(id)
        }
      },
      begin: (source) => {
        if (active.current) end(active.current, 'cancel')
        // The source keeps only this identity. Measured views belong to the active scope.
        const token = { ...source }
        const gesture: ActiveGesture = { token, pending: [] }
        active.current = gesture
        handlers.current.onDragStart?.(source)
        if (retainTarget || handlers.current.onDragMove) {
          void measureTargets(targets).then((positions) => {
            if (active.current !== gesture) return
            gesture.positions = positions
            for (const point of gesture.pending.splice(0)) visit(gesture, positions, point)
            if (gesture.ending === 'cancel') end(gesture, 'cancel')
          })
        }
        return token
      },
      hover: (token, x, y) => {
        const gesture = active.current
        if (gesture?.token !== token || gesture.ending) return
        if (gesture.positions) visit(gesture, gesture.positions, { x, y })
        else if (retainTarget) gesture.pending.push({ x, y })
      },
      release: (token, x, y) => {
        const gesture = active.current
        if (gesture?.token !== token || gesture.ending) return
        gesture.ending = 'drop'
        void measureTargets(targets).then((positions) => {
          if (active.current !== gesture || gesture.ending !== 'drop') return
          for (const point of gesture.pending.splice(0)) visit(gesture, positions, point)
          end(gesture, 'drop', targetAt(targets, positions, x, y))
        })
      },
      cancel: (token, reason = 'cancel') => {
        const gesture = active.current
        if (gesture?.token !== token) return
        // A fast interruption can arrive before the bridge measures the targets.
        if (reason === 'cancel' && gesture.pending.length) gesture.ending = reason
        else end(gesture, reason)
      },
      activate: (source, targetId) => {
        if (!targets.has(targetId)) return
        if (active.current) end(active.current, 'cancel')
        handlers.current.onDragEnd?.({ ...source, overId: targetId, reason: 'drop' })
      },
    }
  }, [retainTarget])
  useLayoutEffect(
    () => () => {
      if (active.current) scope.cancel(active.current.token, 'unmount')
    },
    [scope],
  )
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
}

/** Reads the interaction scope that owns this source or target. */
function useGestureScope(): GestureScope {
  const scope = useContext(ScopeContext)
  if (!scope) throw new Error('Native drag sources and targets require a drag scope.')
  return scope
}

/** Registers the native host whose measured bounds can accept a drop. */
function useTargetRef<Host>(
  id: string,
  measure: (host: Host, receive: (box: ElementBox) => void) => void,
): RefCallback<Host> {
  const { register } = useGestureScope()
  const unregister = useRef<() => void>(null)
  return useCallback(
    (host) => {
      unregister.current?.()
      unregister.current = host ? register(id, (receive) => measure(host, receive)) : null
    },
    [id, measure, register],
  )
}

/** Matches the root coordinates emitted by the legacy PanResponder source. */
function measureInRoot(view: View, receive: (box: ElementBox) => void): void {
  view.measure((_left, _top, width, height, x, y) => receive({ x, y, width, height }))
}

/** Measures and registers the native host that accepts a drop. */
function DropTarget({ id, children }: DragTargetProps): ReactElement {
  const setView = useTargetRef(id, measureInRoot)
  return (
    <View collapsable={false} ref={setView}>
      {children}
    </View>
  )
}

/** Binds a native responder and provides individually accessible move actions. */
function DragSource({ source, controls, children }: DragSourceProps): ReactElement {
  const scope = useGestureScope()
  const currentSource = useRef(source)
  const gesture = useRef<DragStartEvent | null>(null)
  useLayoutEffect(() => {
    currentSource.current = source
  }, [source])
  useLayoutEffect(
    () => () => {
      if (gesture.current) scope.cancel(gesture.current, 'unmount')
    },
    [scope],
  )

  const { panHandlers } = useMemo(() => {
    const cancel = (): void => {
      if (gesture.current) scope.cancel(gesture.current)
      gesture.current = null
    }
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, { dx, dy, numberActiveTouches }) =>
        numberActiveTouches === 1 && Math.hypot(dx, dy) >= DRAG_THRESHOLD,
      onPanResponderGrant: () => {
        gesture.current = scope.begin(currentSource.current)
      },
      onPanResponderStart: (_event, { numberActiveTouches }) => {
        if (numberActiveTouches > 1) cancel()
      },
      onPanResponderMove: (_event, { moveX, moveY }) => {
        if (gesture.current) scope.hover(gesture.current, moveX, moveY)
      },
      onPanResponderRelease: ({ nativeEvent: { pageX, pageY } }) => {
        if (gesture.current) scope.release(gesture.current, pageX, pageY)
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderReject: cancel,
      onPanResponderTerminate: cancel,
    })
  }, [scope])

  return (
    <>
      <View accessible={false} {...panHandlers}>
        {children}
      </View>
      <MoveControls source={source} controls={controls} />
    </>
  )
}

/** Offers accessible move actions using the same target IDs as a drag. */
function MoveControls({
  source,
  controls,
}: {
  source: DragStartEvent
  controls?: DragMoveControls
}): ReactElement | null {
  const scope = useGestureScope()
  const [expanded, setExpanded] = useState(false)
  if (!controls || controls.choices.length === 0) return null
  const controlLabel = expanded ? controls.cancelLabel : controls.label
  return (
    <>
      <Pressable
        as="button"
        type="button"
        className={controls.className}
        data-mol-id={controls.id}
        aria-label={controlLabel}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {controlLabel}
      </Pressable>
      {expanded &&
        controls.choices.map(({ targetId, label }) => (
          <Pressable
            key={targetId}
            as="button"
            type="button"
            className={controls.className}
            data-mol-id={`${controls.id}-to-${targetId}`}
            aria-label={label}
            onClick={() => {
              setExpanded(false)
              scope.activate(source, targetId)
            }}
          >
            {label}
          </Pressable>
        ))}
    </>
  )
}

/** Keeps the current target when dragging between renders. */
function ScopedScope(props: DragScopeProps): ReactElement {
  return <DragScope {...props} retainTarget />
}

/** Binds a draggable element and its move controls to the scope. */
function ScopedSource({
  source,
  controls,
  disabled,
  children,
}: ScopedDragSourceProps): ReactElement {
  const scope = useGestureScope()
  const token = useRef<DragStartEvent>(null)
  useLayoutEffect(
    () => () => {
      if (token.current) scope.cancel(token.current, 'unmount')
      token.current = null
    },
    [scope, source.id, disabled],
  )
  /** Sends the element contact to the scope in window coordinates. */
  function move({ x, y, bounds }: ElementDragPoint, terminal: boolean): void {
    if (!token.current) return
    const send = terminal ? scope.release : scope.hover
    send(token.current, bounds.x + x, bounds.y + y)
  }
  const drag: ElementDrag | undefined = disabled
    ? undefined
    : {
        onStart: () => {
          token.current = scope.begin(source)
        },
        onMove: (point) => move(point, false),
        onEnd: (point) => move(point, true),
        onCancel: () => {
          if (token.current) scope.cancel(token.current)
        },
      }
  return (
    <>
      {children({ drag })}
      {!disabled && <MoveControls source={source} controls={controls} />}
    </>
  )
}

/** Wires an element as a target, optionally with a drag source. */
function ScopedTarget({ id, source, children }: ScopedDragTargetProps): ReactElement {
  const ref = useTargetRef<ElementHandle>(id, measureElement)
  return source ? (
    <ScopedSource {...source} source={{ id }}>
      {({ drag }) => children({ ref, drag })}
    </ScopedSource>
  ) : (
    <>{children({ ref })}</>
  )
}

const nativeDragDrop: DragDropRenderer = {
  Scope: DragScope,
  Source: DragSource,
  Target: DropTarget,
  scoped: { Scope: ScopedScope, Source: ScopedSource, Target: ScopedTarget },
}

/** Enables React Native drag-and-drop gestures and move controls in the subtree. */
export function NativeDragDropProvider({ children }: { children: ReactNode }): ReactElement {
  return <DragDropRendererProvider value={nativeDragDrop}>{children}</DragDropRendererProvider>
}
