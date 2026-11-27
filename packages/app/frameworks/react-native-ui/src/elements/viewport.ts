/**
 * Window operations for registered native elements.
 *
 * @module
 */

import { useLayoutEffect } from 'react'
import { Dimensions } from 'react-native'

import type { ElementHandle, ElementViewport, KitFocusEvent } from '@molecule/app-ui'

import { measureElement } from './measure.js'

const windowScope = {}

/** Runs after committing native host refs and before painting. */
export const useElementLayoutEffect = useLayoutEffect

/**
 * Identifies the native app window whose overlays share one active tooltip.
 *
 * @param _handle - The registered element.
 * @returns The native window identity.
 */
export function elementWindowScope(_handle: ElementHandle): object {
  return windowScope
}

/**
 * Reads the current logical-pixel window dimensions. Native content scrolls in a ScrollArea.
 *
 * @param _handle - The registered element.
 * @returns The native window viewport.
 */
export function readElementViewport(_handle: ElementHandle): ElementViewport {
  const { width, height } = Dimensions.get('window')
  return { width, height, contentHeight: height, scrollOwner: 'element' }
}

/**
 * Reports initial dimensions and later window size changes. ScrollArea reports its own scrolling.
 *
 * @param handle - The registered element.
 * @param update - Receives the current viewport and its resize flag.
 * @returns Unsubscribes from window updates.
 */
export function observeElementViewport(
  handle: ElementHandle,
  update: (viewport: ElementViewport, resized: boolean) => void,
): () => void {
  const resize = (): void => update(readElementViewport(handle), true)
  const subscription = Dimensions.addEventListener('change', resize)
  resize()
  return () => subscription.remove()
}

/**
 * Measures a positioned surface's actual containing origin inside the native overlay host.
 *
 * @param handle - The positioned view.
 * @param position - The left and top currently applied to the view.
 * @param onMeasure - Receives the window coordinates of the positioning origin.
 */
export function measurePositionedOrigin(
  handle: ElementHandle,
  position: { left: number; top: number },
  onMeasure: (origin: { x: number; y: number }) => void,
): void {
  measureElement(handle, ({ x, y }) => onMeasure({ x: x - position.left, y: y - position.top }))
}

/**
 * Native focus is a device focus action, without a CSS focus-visibility selector.
 *
 * @param _event - The focus event.
 * @returns Whether to show supplemental content.
 */
export function isElementFocusVisible(_event: KitFocusEvent): boolean {
  return true
}
