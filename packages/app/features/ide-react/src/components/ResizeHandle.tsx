/**
 * Drag handle for resizing panels.
 *
 * @module
 */

import type {
  JSX,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useCallback, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { ResizeHandleProps } from '../types.js'

/**
 * Width (px) of the invisible grab zone — far wider than the visible line so it
 * is a comfortable target for both a mouse and a finger (WCAG 2.5.5).
 */
const GRAB_PX = 11
/** Visible line thickness (px) at rest. */
const LINE_PX = 1
/** Visible line thickness (px) while hovered or actively dragging. */
const LINE_ACTIVE_PX = 3
/** Pixels moved per arrow-key press for keyboard resize. */
const KEYBOARD_STEP_PX = 24

/**
 * Draggable handle for resizing adjacent panels. Uses Pointer Events so it works
 * with mouse, touch, and pen (an iPad drag resizes just like a desktop drag); a
 * wide invisible grab zone wraps a thin visible line that brightens to the
 * primary color on hover/drag for a clear affordance. Arrow keys nudge the split
 * for keyboard users.
 * @param props - Component props.
 * @returns The rendered resize handle element.
 */
export function ResizeHandle({
  onResize,
  direction = 'horizontal',
  className,
}: ResizeHandleProps): JSX.Element {
  const cm = getClassMap()
  const startRef = useRef<number>(0)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isHorizontal = direction === 'horizontal'

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      draggingRef.current = true
      setDragging(true)
      startRef.current = isHorizontal ? e.clientX : e.clientY
      // Capture the pointer so move/up keep firing on THIS element even when the
      // cursor leaves it mid-drag — the touch-safe replacement for global
      // document mousemove/mouseup listeners.
      e.currentTarget.setPointerCapture(e.pointerId)
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [isHorizontal],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      const current = isHorizontal ? e.clientX : e.clientY
      const delta = current - startRef.current
      if (delta === 0) return
      startRef.current = current
      onResize(delta)
    },
    [isHorizontal, onResize],
  )

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const decreaseKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'
      const increaseKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
      if (e.key === decreaseKey) {
        e.preventDefault()
        onResize(-KEYBOARD_STEP_PX)
      } else if (e.key === increaseKey) {
        e.preventDefault()
        onResize(KEYBOARD_STEP_PX)
      }
    },
    [isHorizontal, onResize],
  )

  const highlighted = dragging || hovered
  const lineThickness = highlighted ? LINE_ACTIVE_PX : LINE_PX

  return (
    <div
      data-mol-id="workspace-resize-handle"
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-label={t('ide.resizeHandle.label', undefined, { defaultValue: 'Resize panels' })}
      tabIndex={0}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.shrink0,
        className,
      )}
      style={{
        cursor: isHorizontal ? 'col-resize' : 'row-resize',
        // Stop the browser claiming the gesture for scroll/zoom on touch devices.
        touchAction: 'none',
        // Keep the comfortable GRAB_PX touch target, but collapse its LAYOUT
        // footprint to the 1px line with symmetric negative margins, so the divider
        // reads as a single flush line between the panels (no gap) while the extra
        // grab width overflows onto the panel edges. Raised above the panes so that
        // overflow stays grabbable.
        position: 'relative',
        zIndex: 1,
        width: isHorizontal ? GRAB_PX : '100%',
        height: isHorizontal ? '100%' : GRAB_PX,
        ...(isHorizontal
          ? {
              marginLeft: -(GRAB_PX - LINE_PX) / 2,
              marginRight: -(GRAB_PX - LINE_PX) / 2,
            }
          : {
              marginTop: -(GRAB_PX - LINE_PX) / 2,
              marginBottom: -(GRAB_PX - LINE_PX) / 2,
            }),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onKeyDown={onKeyDown}
    >
      {/* Thin visible line, centered in the grab zone. Background comes from a
          ClassMap token (not inline) so the theme controls the color and the
          hover/active state swaps token rather than fighting CSS specificity. */}
      <div
        aria-hidden="true"
        className={cm.cn(highlighted ? cm.bgPrimary : cm.bgBorder)}
        style={{
          width: isHorizontal ? lineThickness : '100%',
          height: isHorizontal ? '100%' : lineThickness,
          borderRadius: 9999,
          transition: 'background-color 150ms ease, width 150ms ease, height 150ms ease',
        }}
      />
    </div>
  )
}

ResizeHandle.displayName = 'ResizeHandle'
