/**
 * A browser file picker and drop target.
 *
 * @module
 */

import { forwardRef, type ReactNode, useEffect, useImperativeHandle, useRef } from 'react'

import {
  createBrowserFileInput,
  filterPickedFiles,
  fromBrowserFile,
  type PickedFile,
} from '@molecule/app-filesystem'
import type { FileFieldHandle, FileFieldProps } from '@molecule/app-ui'

import { webElementStyle } from './style.js'

/**
 * Renders a browser chooser with its own target or separately rendered triggers.
 */
export const FileField = forwardRef<FileFieldHandle, FileFieldProps<ReactNode>>(function FileField(
  {
    accept,
    children,
    disabled,
    externalTrigger,
    maxSize,
    multiple,
    onPickError,
    onRejected,
    onValueChange,
    role = 'button',
    style,
    tabIndex,
    webDrop,
    webInputDisplayNone,
    webStyle,
    ...attrs
  },
  ref,
) {
  const input = useRef<HTMLInputElement>(null)
  const options = {
    accept,
    disabled,
    maxSize,
    multiple,
    onPickError,
    onRejected,
    onFiles: onValueChange,
  }
  const handlers = createBrowserFileInput(
    () => input.current,
    () => options,
    fromBrowserFile,
  )
  useImperativeHandle(ref, () => ({
    pick: () => handlers.onClick({ target: null, defaultPrevented: false }),
  }))

  const dropMultiple = webDrop?.multiple ?? multiple
  const onDroppedFiles = webDrop?.onValueChange ?? onValueChange
  const drop = createBrowserFileInput(
    () => input.current,
    () =>
      webDrop?.rejectBatch
        ? { disabled, onPickError, multiple: true, onFiles: deliverWholeDrop }
        : { ...options, multiple: dropMultiple, onFiles: onDroppedFiles },
    fromBrowserFile,
  )

  /**
   * Delivers the batch only if every file passes the drop policy.
   * @param files - The files copied from the browser drop.
   */
  function deliverWholeDrop(files: PickedFile[]): void {
    const { accepted, rejected } = filterPickedFiles(files, {
      accept,
      maxSize,
      multiple: dropMultiple,
    })
    if (rejected.length > 0) onRejected?.(rejected)
    else if (accepted.length > 0) onDroppedFiles(accepted)
  }
  /**
   * Marks an enabled drop target active.
   * @param event - The browser drag-over event.
   */
  function dragOver(event: Pick<DragEvent, 'preventDefault'>): void {
    if (drop.onDragOver(event)) webDrop?.onActiveChange?.(true)
  }
  /** Clears the drag highlight after a leave or a drop. */
  function dragLeave(): void {
    webDrop?.onActiveChange?.(false)
  }
  /**
   * Resets the drag state and delivers the files.
   * @param event - The browser drop event.
   */
  function dropFiles(event: Pick<DragEvent, 'dataTransfer' | 'preventDefault'>): void {
    dragLeave()
    drop.onDrop(event)
  }

  const dropTarget = webDrop?.target
  useEffect(() => {
    if (!(dropTarget instanceof HTMLElement)) return
    dropTarget.addEventListener('dragover', dragOver)
    dropTarget.addEventListener('dragleave', dragLeave)
    dropTarget.addEventListener('drop', dropFiles)
    return () => {
      dropTarget.removeEventListener('dragover', dragOver)
      dropTarget.removeEventListener('dragleave', dragLeave)
      dropTarget.removeEventListener('drop', dropFiles)
    }
  })

  const chooser = (
    <input
      ref={input}
      type="file"
      hidden={!webInputDisplayNone}
      style={webInputDisplayNone ? { display: 'none' } : undefined}
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      onChange={handlers.onChange}
    />
  )
  if (externalTrigger) return chooser
  return (
    <div
      data-mol-id="file-field"
      role={role}
      {...attrs}
      tabIndex={tabIndex ?? (disabled ? -1 : 0)}
      aria-disabled={disabled}
      style={webElementStyle(style, webStyle)}
      onClick={handlers.onClick}
      onKeyDown={handlers.onKeyDown}
      onDragOver={dropTarget === undefined ? dragOver : undefined}
      onDragLeave={dropTarget === undefined ? dragLeave : undefined}
      onDrop={dropTarget === undefined ? dropFiles : undefined}
    >
      {chooser}
      {children}
    </div>
  )
})
