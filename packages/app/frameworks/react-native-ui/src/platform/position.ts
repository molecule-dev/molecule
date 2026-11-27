/** Native measurement and lifetime for anchored overlays. */
import { useContext, useLayoutEffect, useState } from 'react'
import { Keyboard, useWindowDimensions } from 'react-native'
import { SafeAreaInsetsContext } from 'react-native-safe-area-context'

import type { AnchoredPosition, AnchoredPositionOptions } from '@molecule/app-react/overlay'
import { calculateOverlayPosition, type ElementBox, type ElementHandle } from '@molecule/app-ui'

import { measureElement } from '../elements/measure.js'
import { observeLayout, type ScrollViewport, ScrollViewportScope } from './layout.js'
import type { NativeLayer } from './stack.js'

/** Checks whether one rectangle can render within the other. */
function contains(bounds: ElementBox, box: ElementBox, rounding: number): boolean {
  return (
    box.x >= bounds.x - rounding &&
    box.y >= bounds.y - rounding &&
    box.x + box.width <= bounds.x + bounds.width + rounding &&
    box.y + box.height <= bounds.y + bounds.height + rounding
  )
}

/** Measures any clipping scroll ancestors in the same window coordinate space. */
function fitsScrollViewports(
  viewport: ScrollViewport | null,
  boxes: readonly ElementBox[],
  rounding: number,
  report: (fits: boolean) => void,
): void {
  const handle = viewport?.target.current
  if (!viewport || !handle) return report(true)
  measureElement(handle, (bounds) => {
    if (!boxes.every((box) => contains(bounds, box, rounding))) report(false)
    else fitsScrollViewports(viewport.parent, boxes, rounding, report)
  })
}

/** Measures the source-tree portal, ignoring callbacks from earlier requests or open intervals. */
export function useNativePosition(
  entry: NativeLayer,
  {
    open,
    anchor,
    surface,
    placement,
    align,
    offset,
    padding,
    collision,
    matchAnchorWidth,
    listFallback,
    contentKey,
  }: AnchoredPositionOptions,
): AnchoredPosition {
  const { width, height, scale } = useWindowDimensions()
  const insets = useContext(SafeAreaInsetsContext)
  const scrollViewport = useContext(ScrollViewportScope)
  const [sample, setSample] = useState<{ surface: ElementHandle; position: AnchoredPosition }>()
  const [fallback, setFallback] = useState(false)
  useLayoutEffect(() => {
    if (!open) {
      setFallback(false)
      setSample(undefined)
      return
    }
    if (!surface || fallback) return

    let generation = 0
    let disposed = false
    let frame: number | undefined
    let keyboardTop = Keyboard.metrics()?.screenY
    let measurementTimeout: ReturnType<typeof setTimeout> | undefined = listFallback
      ? setTimeout(() => {
          if (!disposed) setFallback(true)
        }, 250)
      : undefined

    const schedule = (): void => {
      const request = ++generation
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = undefined
        const trigger = anchor.current
        const plane = entry.plane.current
        if (
          !trigger ||
          !plane ||
          !('measureInWindow' in trigger) ||
          typeof trigger.measureInWindow !== 'function'
        )
          return
        const valid = (): boolean =>
          !disposed &&
          generation === request &&
          trigger === anchor.current &&
          plane === entry.plane.current

        measureElement(trigger, (reference) => {
          if (!valid() || reference.width <= 0 || reference.height <= 0) return
          measureElement(plane, (host) => {
            if (!valid() || host.width <= 0 || host.height <= 0) return
            measureElement(surface, (size) => {
              if (!valid()) return
              const left = insets?.left ?? 0
              const top = insets?.top ?? 0
              const bottom = Math.min(height - (insets?.bottom ?? 0), keyboardTop ?? height)
              const viewport = {
                x: left,
                y: top,
                width: Math.max(0, width - left - (insets?.right ?? 0)),
                height: Math.max(0, bottom - top),
              }
              const anchorWidth = matchAnchorWidth ? reference.width : undefined
              const dimensions = { width: anchorWidth ?? size.width, height: size.height }
              const position = calculateOverlayPosition(reference, dimensions, viewport, {
                placement,
                align,
                offset,
                padding,
                collision,
              })
              const publish = (fits: boolean): void => {
                if (!valid()) return
                clearTimeout(measurementTimeout)
                measurementTimeout = undefined
                if (!fits) {
                  setFallback(true)
                  return
                }
                const next = {
                  ...position,
                  top: position.top - host.y,
                  left: position.left - host.x,
                  ready: true,
                  anchorWidth,
                }
                setSample((previous) =>
                  previous?.surface === surface &&
                  previous.position.left === next.left &&
                  previous.position.top === next.top &&
                  previous.position.placement === next.placement &&
                  previous.position.anchorWidth === anchorWidth
                    ? previous
                    : { surface, position: next },
                )
              }
              if (!listFallback) return publish(true)
              const menu = { ...dimensions, x: position.left, y: position.top }
              const boxes = [reference, menu]
              const rounding = 1 / scale
              if (!boxes.every((box) => contains(viewport, box, rounding))) return publish(false)
              fitsScrollViewports(scrollViewport, boxes, rounding, publish)
            })
          })
        })
      })
    }
    const unsubscribe = observeLayout(schedule)
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop = event.endCoordinates.screenY
      schedule()
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop = undefined
      schedule()
    })
    schedule()
    return () => {
      disposed = true
      unsubscribe()
      show.remove()
      hide.remove()
      clearTimeout(measurementTimeout)
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [
    entry,
    open,
    anchor,
    surface,
    placement,
    align,
    offset,
    padding,
    collision,
    matchAnchorWidth,
    listFallback,
    contentKey,
    width,
    height,
    scale,
    insets,
    scrollViewport,
    fallback,
  ])

  if (open && fallback) return { top: 0, left: 0, placement, ready: true, fallback: true }
  return open && sample && sample.surface === surface
    ? sample.position
    : { top: 0, left: 0, placement, ready: false }
}
