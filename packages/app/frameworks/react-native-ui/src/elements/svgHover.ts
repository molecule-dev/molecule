/**
 * Hosts shape hover on the native SVG viewport without claiming the touch responder.
 *
 * @module
 */

import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { PointerEvent, View, ViewProps } from 'react-native'
import type { Rect } from 'react-native-svg'

import type { SvgProps, SvgRectProps } from '@molecule/app-ui'

import { mouseEvent } from './events.js'

type Point = { x: number; y: number }
type HoverTarget = {
  hit(viewport: Point, svg: Point): boolean
  enter: NonNullable<SvgRectProps['onMouseEnter']>
}
type RegisterHover = (id: string, target: HoverTarget) => () => void
type HoverHandlers = Pick<ViewProps, 'onPointerEnter' | 'onPointerMoveCapture' | 'onPointerLeave'>

/** Shape registrations are owned by the enclosing canvas. */
export const SvgHoverScope = createContext<RegisterHover | null>(null)

/** Converts a viewport point to the canvas's view box, including letterboxing and slicing. */
function drawingPoint(
  point: Point,
  width: number,
  height: number,
  viewBox: string | undefined,
  aspect: string | undefined,
): Point {
  const [minX, minY, vbWidth, vbHeight] = (viewBox ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !(vbWidth > 0 && vbHeight > 0)) {
    return point
  }
  const [align, mode] = (aspect ?? 'xMidYMid meet').trim().split(/\s+/)
  const sx = width / vbWidth
  const sy = height / vbHeight
  if (align === 'none') return { x: point.x / sx + minX, y: point.y / sy + minY }
  const scale = mode === 'slice' ? Math.max(sx, sy) : Math.min(sx, sy)
  const extraX = width - vbWidth * scale
  const extraY = height - vbHeight * scale
  const dx = align?.startsWith('xMin') ? 0 : align?.startsWith('xMax') ? extraX : extraX / 2
  const dy = align?.endsWith('YMin') ? 0 : align?.endsWith('YMax') ? extraY : extraY / 2
  return { x: (point.x - dx) / scale + minX, y: (point.y - dy) / scale + minY }
}

/**
 * Tracks pointer entry and movement at the canvas, even when the native event targets a shape.
 *
 * @param props - The viewport's coordinate system and hit-testing mode.
 * @returns The host ref, registration function and pointer handlers.
 */
export function useSvgHover(props: Pick<SvgProps, 'viewBox' | 'preserveAspectRatio' | 'style'>): {
  host: RefObject<View | null>
  register: RegisterHover
  handlers: HoverHandlers
} {
  const host = useRef<View | null>(null)
  const targets = useRef(new Map<string, HoverTarget>())
  const hovered = useRef<string | undefined>(undefined)
  const sequence = useRef({ received: 0, handled: 0 })
  const [active, setActive] = useState(false)
  const register = useCallback<RegisterHover>((id, target) => {
    targets.current.set(id, target)
    setActive(true)
    return () => {
      targets.current.delete(id)
      if (targets.current.size === 0) setActive(false)
    }
  }, [])
  const leave = (): void => {
    hovered.current = undefined
    sequence.current.handled = ++sequence.current.received
  }
  const move = (event: PointerEvent): void => {
    const pointer = event.nativeEvent
    if (pointer.pointerType !== 'mouse' && !(pointer.pointerType === 'pen' && !pointer.buttons)) {
      return
    }
    const sample = ++sequence.current.received
    // measure() and the pointer's page coordinates share the enclosing React root, including
    // when it is a modal. The event's offset may be relative to a nested SVG shape.
    host.current?.measure?.((_x, _y, width, height, pageX, pageY) => {
      if (sample <= sequence.current.handled) return
      sequence.current.handled = sample
      const point = { x: pointer.pageX - pageX, y: pointer.pageY - pageY }
      const inside = point.x >= 0 && point.x < width && point.y >= 0 && point.y < height
      const svg = inside
        ? drawingPoint(point, width, height, props.viewBox, props.preserveAspectRatio)
        : undefined
      let match: [string, HoverTarget] | undefined
      if (svg) {
        for (const entry of targets.current) {
          if (entry[1].hit(point, svg)) match = entry
        }
      }
      const id = match?.[0]
      if (id === hovered.current) return
      hovered.current = id
      match?.[1].enter(
        Object.assign(mouseEvent(event, pointer.button), {
          clientX: pointer.clientX,
          clientY: pointer.clientY,
          buttons: pointer.buttons,
          altKey: pointer.altKey,
          ctrlKey: pointer.ctrlKey,
          metaKey: pointer.metaKey,
          shiftKey: pointer.shiftKey,
        }),
      )
    })
  }
  const handlers: HoverHandlers =
    active && props.style?.pointerEvents !== 'none'
      ? { onPointerEnter: move, onPointerMoveCapture: move, onPointerLeave: leave }
      : {}
  return { host, register, handlers }
}

/** Uses the pinned SVG shape's matrix, which includes its transforms and the viewport mapping. */
function localPoint(shape: Rect | null, viewport: Point): Point | null | undefined {
  const matrix = shape?.getScreenCTM?.()
  if (!matrix) return undefined
  const { a, b, c, d, e, f } = matrix
  const determinant = a * d - b * c
  if (!Number.isFinite(determinant) || determinant === 0) return null
  const x = viewport.x - e
  const y = viewport.y - f
  return { x: (d * x - c * y) / determinant, y: (a * y - b * x) / determinant }
}

/** Tests a rectangle's actual local outline, including rounded corners. */
function inRect(point: Point, props: SvgRectProps): boolean {
  const { x = 0, y = 0, width, height, rx, ry } = props
  const dx = point.x - x
  const dy = point.y - y
  if (!(dx >= 0 && dx < width && dy >= 0 && dy < height)) return false
  const radiusX = Math.min(rx ?? ry ?? 0, width / 2)
  const radiusY = Math.min(ry ?? rx ?? 0, height / 2)
  if (radiusX <= 0 || radiusY <= 0) return true
  const cornerX = Math.max(radiusX - dx, dx - width + radiusX, 0) / radiusX
  const cornerY = Math.max(radiusY - dy, dy - height + radiusY, 0) / radiusY
  return cornerX ** 2 + cornerY ** 2 <= 1
}

/**
 * Registers a hover-enabled rectangle with the canvas and keeps the native shape's transform.
 *
 * @param props - The rectangle's geometry, hover listener and hit-testing mode.
 * @returns The rectangle's native ref.
 */
export function useRectHover(props: SvgRectProps): RefObject<Rect | null> | undefined {
  const id = useId()
  const register = useContext(SvgHoverScope)
  const shape = useRef<Rect | null>(null)
  const { onMouseEnter } = props
  const pointerEvents = props.style?.pointerEvents ?? props.pointerEvents
  useLayoutEffect(() => {
    if (!register || !onMouseEnter || pointerEvents === 'none') return
    return register(id, {
      enter: onMouseEnter,
      hit: (viewport, svg) => {
        const point = localPoint(shape.current, viewport)
        return point !== null && inRect(point ?? svg, props)
      },
    })
  }, [id, onMouseEnter, pointerEvents, props, register])
  return onMouseEnter && pointerEvents !== 'none' ? shape : undefined
}
