/**
 * Window operations for registered browser elements.
 *
 * @module
 */

import { useEffect, useLayoutEffect } from 'react'

import { domElement } from '@molecule/app-overlay-dom'
import type { ElementHandle, ElementViewport, KitFocusEvent } from '@molecule/app-ui'

const detachedWindow = {}

/** Runs after committing host refs and before painting. Server rendering has no layout. */
export const useElementLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Identifies the window containing a handle. Browser documents keep their own overlay state.
 *
 * @param handle - The registered element.
 * @returns An opaque identity usable as a weak map key.
 */
export function elementWindowScope(handle: ElementHandle): object {
  return domElement(handle)?.ownerDocument ?? detachedWindow
}

/**
 * Reads the viewport containing an element without consulting the ambient document.
 *
 * @param handle - The registered element.
 * @returns The owning viewport, if mounted.
 */
export function readElementViewport(handle: ElementHandle): ElementViewport | undefined {
  const doc = domElement(handle)?.ownerDocument
  const view = doc?.defaultView
  if (!doc || !view) return
  return {
    width: doc.documentElement.clientWidth,
    height: view.innerHeight,
    contentHeight: doc.documentElement.clientHeight,
    scrollOwner: 'document',
  }
}

/**
 * Reports the current viewport immediately and coalesces resize and scroll updates per frame.
 *
 * @param handle - The registered element. Scrolls in its document, including nested scrollers, are observed.
 * @param update - Receives the viewport and whether its size may have changed.
 * @returns Unsubscribes and cancels queued measurements.
 */
export function observeElementViewport(
  handle: ElementHandle,
  update: (viewport: ElementViewport, resized: boolean) => void,
): () => void {
  const view = domElement(handle)?.ownerDocument.defaultView
  if (!view) return () => undefined
  let frame: number | undefined
  let resized = false
  const read = (): void => {
    frame = undefined
    const viewport = readElementViewport(handle)
    const changedSize = resized
    resized = false
    if (viewport) update(viewport, changedSize)
  }
  const schedule = (): void => {
    frame ??= view.requestAnimationFrame(read)
  }
  const resize = (): void => {
    resized = true
    schedule()
  }
  view.addEventListener('scroll', schedule, { capture: true, passive: true })
  view.addEventListener('resize', resize)
  resized = true
  read()
  return () => {
    view.removeEventListener('scroll', schedule, true)
    view.removeEventListener('resize', resize)
    if (frame !== undefined) view.cancelAnimationFrame(frame)
  }
}

/**
 * Reads the document portal's positioning origin in the same coordinates as measureElement.
 *
 * @param handle - The positioned surface in the portal.
 * @param _position - The applied absolute position, needed by the native renderer.
 * @param onMeasure - Receives the window coordinates of the positioning origin.
 */
export function measurePositionedOrigin(
  handle: ElementHandle,
  _position: { left: number; top: number },
  onMeasure: (origin: { x: number; y: number }) => void,
): void {
  const view = domElement(handle)?.ownerDocument.defaultView
  if (view) onMeasure({ x: -view.scrollX, y: -view.scrollY })
}

/**
 * Whether focus should reveal supplemental tooltip content.
 *
 * @param event - The focus event from the trigger or one of its children.
 * @returns Whether the browser considers the focused element focus-visible.
 */
export function isElementFocusVisible(event: KitFocusEvent): boolean {
  try {
    return domElement(event.target)?.matches(':focus-visible') ?? false
  } catch (_error) {
    // Older selector engines do not implement :focus-visible. Hover remains available.
    return false
  }
}
