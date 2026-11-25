import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'

import type {
  DragScopeProps,
  ScopedDragDropRenderer,
  ScopedDragHostProps,
  ScopedDragSourceProps,
  ScopedDragTargetProps,
} from './react.js'
import type { DragEndEvent, DragStartEvent } from './types.js'

type EndReason = NonNullable<DragEndEvent['reason']>
type HostRef = Extract<ScopedDragHostProps['ref'], (value: never) => unknown>

interface WebDrag {
  host: HTMLElement
  finish(reason: EndReason): void
}

interface WebScope {
  targets: Map<HTMLElement, string>
  begin(host: HTMLElement, source: DragStartEvent, event: PointerEvent): boolean
  detach(host: HTMLElement): void
}

const ScopeContext = createContext<WebScope | null>(null)
const claimed = new WeakSet<Event>()
const useCommitEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const controls =
  'button, input, textarea, select, label, a[href], [role="button"], [role="link"], [contenteditable]:not([contenteditable="false"])'

/** Resolves a ref only when it contains an HTML host, including hosts in another window. */
function isHtmlHost(value: unknown): value is HTMLElement {
  if (typeof value !== 'object' || value === null || !('ownerDocument' in value)) return false
  const document = value.ownerDocument
  if (typeof document !== 'object' || document === null || !('defaultView' in document))
    return false
  const window = document.defaultView
  return (
    typeof window === 'object' &&
    window !== null &&
    'HTMLElement' in window &&
    typeof window.HTMLElement === 'function' &&
    value instanceof window.HTMLElement
  )
}

/** Tracks pointer ownership and target identity inside one authored feature. */
function Scope({ children, ...callbacks }: DragScopeProps): ReactElement {
  const handlers = useRef(callbacks)
  const active = useRef<WebDrag>(null)
  useCommitEffect(() => {
    handlers.current = callbacks
  })
  useCommitEffect(() => () => active.current?.finish('unmount'), [])

  const scope = useMemo<WebScope>(() => {
    const targets = new Map<HTMLElement, string>()
    return {
      targets,
      begin(host, source, down) {
        const document = host.ownerDocument
        const ownerWindow = document.defaultView
        if (!ownerWindow || active.current || claimed.has(down) || down.defaultPrevented)
          return false
        if (down.button !== undefined && down.button !== 0) return false
        if (down.pointerType && down.isPrimary === false) return false
        const window = ownerWindow
        if (!(down.target instanceof window.Element)) return false
        const control = down.target.closest(controls)
        if (control && control !== host && host.contains(control)) return false
        claimed.add(down)
        const { pointerId } = down
        let over: { host: HTMLElement; id: string } | undefined
        let captured = false
        const drag: WebDrag = { host, finish }
        active.current = drag

        /** Finds the nearest registered host above the hit. Gaps keep the last target. */
        function visit(hit: EventTarget | null): void {
          if (!(hit instanceof window.Element)) return
          for (let node: Element | null = hit; node; node = node.parentElement) {
            if (!(node instanceof window.HTMLElement)) continue
            const id = targets.get(node)
            if (id === undefined) continue
            if (over?.host === node && over.id === id) return
            over = { host: node, id }
            handlers.current.onDragMove?.({ ...source, overId: id })
            return
          }
        }

        /** Hit-tests viewport coordinates even while capture retargets the event. */
        function move(event: PointerEvent): void {
          if (event.pointerId !== pointerId) return
          visit(
            document.elementFromPoint
              ? document.elementFromPoint(event.clientX, event.clientY)
              : event.target,
          )
        }

        /** Tracks entry when the pointer has not yet delivered a move. */
        function enter(event: PointerEvent): void {
          if (event.pointerId !== undefined && event.pointerId !== pointerId) return
          visit(event.target)
        }

        /** Drops only when the owning contact ends. */
        function release(event: PointerEvent): void {
          if (event.pointerId === pointerId) finish('drop')
        }

        /** Handles a browser cancellation or loss of capture. */
        function cancel(event: PointerEvent): void {
          if (event.pointerId === pointerId) finish('cancel')
        }

        /** Finishes interrupted input when the browser loses focus. */
        function blur(): void {
          finish('cancel')
        }

        /** Reserves the acquired touch for the drag. */
        function preventTouchScroll(event: TouchEvent): void {
          if (event.touches.length === 1 && event.cancelable) event.preventDefault()
        }

        /** Removes listeners and reports one terminal event. */
        function finish(reason: EndReason): void {
          if (active.current !== drag) return
          active.current = null
          window.removeEventListener('pointermove', move, true)
          window.removeEventListener('pointerover', enter, true)
          window.removeEventListener('pointerenter', enter, true)
          window.removeEventListener('pointerup', release, true)
          window.removeEventListener('pointercancel', cancel, true)
          window.removeEventListener('touchmove', preventTouchScroll)
          window.removeEventListener('blur', blur)
          host.removeEventListener('lostpointercapture', cancel)
          if (captured && host.hasPointerCapture?.(pointerId)) host.releasePointerCapture(pointerId)
          const overId =
            over?.host.isConnected && targets.get(over.host) === over.id ? over.id : undefined
          handlers.current.onDragEnd?.({ ...source, overId, reason })
        }

        window.addEventListener('pointermove', move, true)
        window.addEventListener('pointerover', enter, true)
        window.addEventListener('pointerenter', enter, true)
        window.addEventListener('pointerup', release, true)
        window.addEventListener('pointercancel', cancel, true)
        window.addEventListener('blur', blur)
        host.addEventListener('lostpointercapture', cancel)
        if (down.pointerType === 'touch')
          window.addEventListener('touchmove', preventTouchScroll, { passive: false })
        if (Number.isFinite(pointerId) && host.setPointerCapture) {
          try {
            host.setPointerCapture(pointerId)
            captured = true
          } catch (_error) {
            // Synthetic or already-ended contacts may reject capture. The window still observes them.
          }
        }
        handlers.current.onDragStart?.(source)
        return true
      },
      detach(host) {
        if (active.current?.host === host) active.current.finish('unmount')
      },
    }
  }, [])
  return createElement(ScopeContext.Provider, { value: scope }, children)
}

/** Registers the target and source on one existing node, retaining its ref through state updates. */
function useHost(
  targetId: string | undefined,
  source: DragStartEvent | undefined,
  preventDefault: boolean | undefined,
): HostRef {
  const scope = useContext(ScopeContext)
  if (!scope) throw new Error('Scoped drag sources and targets require a drag scope.')
  const latest = useRef({ source, preventDefault })
  const detach = useRef<() => void>(null)
  const sourceId = source?.id
  useCommitEffect(() => {
    latest.current = { source, preventDefault }
  })
  return useCallback(
    (handle) => {
      detach.current?.()
      detach.current = null
      if (!isHtmlHost(handle)) return
      const host = handle
      const down = (event: PointerEvent): void => {
        const { source, preventDefault } = latest.current
        if (source && scope.begin(host, source, event) && preventDefault) event.preventDefault()
      }
      if (targetId !== undefined) scope.targets.set(host, targetId)
      if (sourceId !== undefined) host.addEventListener('pointerdown', down)
      detach.current = () => {
        if (targetId !== undefined) scope.targets.delete(host)
        if (sourceId !== undefined) host.removeEventListener('pointerdown', down)
        scope.detach(host)
      }
    },
    [scope, sourceId, targetId],
  )
}

/** Binds a dedicated source using the host supplied by its caller. */
function Source({ children, disabled, preventDefault, source }: ScopedDragSourceProps): ReactNode {
  return children({ ref: useHost(undefined, disabled ? undefined : source, preventDefault) })
}

/** Registers a destination and optionally starts the drag from the same host. */
function Target({ children, id, source }: ScopedDragTargetProps): ReactNode {
  const ref = useHost(id, source && !source.disabled ? { id } : undefined, source?.preventDefault)
  return children({ ref })
}

/** Default React DOM adapter for scoped source and target bindings. */
export const webScopedDragDrop: ScopedDragDropRenderer = { Scope, Source, Target }
