/**
 * A browser file picker and drop target.
 *
 * @module
 */

import { type JSX, type ReactNode, useRef } from 'react'

import { createBrowserFileInput, fromBrowserFile } from '@molecule/app-filesystem'
import type { FileFieldProps } from '@molecule/app-ui'

/**
 * Renders one focusable target and delivers portable file selections.
 *
 * @param props - The field props.
 * @returns The rendered field.
 */
export function FileField({
  accept,
  children,
  disabled,
  maxSize,
  multiple,
  onPickError,
  onRejected,
  onValueChange,
  role = 'button',
  ...attrs
}: FileFieldProps<ReactNode>): JSX.Element {
  const input = useRef<HTMLInputElement>(null)
  const handlers = createBrowserFileInput(
    () => input.current,
    () => ({
      accept,
      disabled,
      maxSize,
      multiple,
      onPickError,
      onRejected,
      onFiles: onValueChange,
    }),
    fromBrowserFile,
  )

  return (
    <div
      data-mol-id="file-field"
      role={role}
      {...attrs}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handlers.onClick}
      onKeyDown={handlers.onKeyDown}
      onDragOver={handlers.onDragOver}
      onDrop={handlers.onDrop}
    >
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handlers.onChange}
      />
      {children}
    </div>
  )
}
