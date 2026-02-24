/**
 * Drag handle for resizing panels.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useRef } from 'react'

import { getClassMap } from '@molecule/app-ui'

import type { ResizeHandleProps } from '../types.js'

/**
 * Draggable handle for resizing adjacent panels.
 * @param root0 - The component props.
 * @param root0.onResize - Callback invoked with the pixel delta on drag.
 * @param root0.direction - The resize direction, horizontal or vertical.
 * @param root0.className - Optional CSS class name for the handle.
 * @returns The rendered resize handle element.
 */
export function ResizeHandle({
  onResize,
  direction = 'horizontal',
  className,
}: ResizeHandleProps): JSX.Element {
  const cm = getClassMap()
  const startRef = useRef<number>(0)
  const activeRef = useRef(false)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      activeRef.current = true
      startRef.current = direction === 'horizontal' ? e.clientX : e.clientY

      const onMouseMove = (moveEvent: MouseEvent): void => {
        if (!activeRef.current) return
        const current = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY
        const delta = current - startRef.current
        startRef.current = current
        onResize(delta)
      }

      const onMouseUp = (): void => {
        activeRef.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [onResize, direction],
  )

  const isHorizontal = direction === 'horizontal'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        isHorizontal ? cm.w(1) : cm.h(1),
        cm.shrink0,
        cm.bgBorder,
        className,
      )}
      style={{
        cursor: isHorizontal ? 'col-resize' : 'row-resize',
        transition: 'background-color 150ms',
      }}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
    />
  )
}

ResizeHandle.displayName = 'ResizeHandle'
