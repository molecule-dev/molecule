/**
 * `chat:attachments` — file attachments (drag, paste and picker) and the
 * drag-over overlay's state (React's two `chat:attachments` regions, ported by
 * U13).
 *
 * A picked, pasted or dropped file becomes an attachment chip; an image also
 * gets an object-URL preview it revokes on removal. The 20 MB limit reports one
 * banner instead of attaching the file, and every attach clears the previous
 * banner. The drag counter lets a drag that moves between inner layers keep the
 * overlay up until the pointer really leaves the panel.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createSignal } from 'solid-js'

import { MAX_ATTACHMENT_SIZE } from '@molecule/app-ide-panel-logic'
import type { AttachedFile } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:attachments`. */
export interface ChatAttachmentsSlice {
  /** Removes one attachment chip (revoking its preview URL). */
  removeAttachment: (key: string) => void
  /** The hidden file input the attach button opens. */
  fileInputRef: MutableRef<HTMLInputElement | null>
  /** Attaches the files the input picked. */
  handleFileSelect: (event: Event) => void
  /** Attaches the files pasted into the composer. */
  handlePaste: (event: ClipboardEvent) => void
  /** Whether a drag is over the panel (shows the drop overlay). */
  isDragOver: Accessor<boolean>
  /** Accepts a drag over the panel. */
  handleDragOver: (event: DragEvent) => void
  /** Counts a drag entering the panel. */
  handleDragEnter: (event: DragEvent) => void
  /** Counts a drag leaving an inner layer. */
  handleDragLeave: (event: DragEvent) => void
  /** Attaches a dropped file set and clears the overlay. */
  handleDrop: (event: DragEvent) => void
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Creates `chat:attachments`.
 * @param ctx - The inner ctx (the popups that hold the attachments and their banner).
 * @returns The attachments slice.
 */
export function createChatAttachments(ctx: ChatInnerCtx): ChatAttachmentsSlice {
  const fileInputRef: MutableRef<HTMLInputElement | null> = { current: null }
  const [isDragOver, setIsDragOver] = createSignal(false)
  const dragCounterRef: MutableRef<number> = { current: 0 }

  /**
   * Adds every file under the size limit, reporting the first one over it.
   * @param files - The files to attach.
   */
  const addFileAttachments = (files: File[]): void => {
    ctx.popups.setAttachmentError(null)
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        ctx.popups.setAttachmentError(
          ctx.env.t(
            'ide.chat.fileTooLarge',
            { maxSize: '20' },
            { defaultValue: 'File is too large. Maximum size is {{maxSize}}MB.' },
          ),
        )
        continue
      }
      const attachment: AttachedFile = {
        file,
        filename: file.name,
        mediaType: file.type || 'application/octet-stream',
        size: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }
      ctx.popups.setAttachedFiles((prev) => [...prev, attachment])
    }
  }

  /**
   * Attaches the files the hidden input picked and clears it for the next pick.
   * @param event - The input's change event.
   */
  const handleFileSelect = (event: Event): void => {
    const input = event.target as HTMLInputElement
    addFileAttachments(Array.from(input.files ?? []))
    input.value = ''
  }

  /**
   * Attaches the files pasted into the composer; a paste without files is left
   * to the browser.
   * @param event - The composer's paste event.
   */
  const handlePaste = (event: ClipboardEvent): void => {
    const items = Array.from(event.clipboardData?.items ?? [])
    const fileItems = items.filter((item) => item.kind === 'file')
    if (fileItems.length === 0) return

    event.preventDefault()
    const files: File[] = []
    for (const item of fileItems) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
    addFileAttachments(files)
  }

  /**
   * Removes one attachment chip and revokes an image's preview URL.
   * @param key - The chip's key (`path ?? filename`).
   */
  const removeAttachment = (key: string): void => {
    ctx.popups.setAttachedFiles((prev) => {
      const removed = prev.find((f) => (f.path ?? f.filename) === key)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((f) => (f.path ?? f.filename) !== key)
    })
  }

  /**
   * Accepts a drag over the panel.
   * @param event - The drag event.
   */
  const handleDragOver = (event: DragEvent): void => {
    event.preventDefault()
  }

  /**
   * Counts a drag entering the panel and shows the overlay.
   * @param event - The drag event.
   */
  const handleDragEnter = (event: DragEvent): void => {
    event.preventDefault()
    dragCounterRef.current++
    setIsDragOver(true)
  }

  /**
   * Counts a drag leaving an inner layer; the overlay hides on the last leave.
   * @param _event - The drag event (React's handler takes none).
   */
  const handleDragLeave = (_event: DragEvent): void => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }

  /**
   * Attaches a dropped file set and clears the overlay.
   * @param event - The drop event.
   */
  const handleDrop = (event: DragEvent): void => {
    event.preventDefault()
    dragCounterRef.current = 0
    setIsDragOver(false)
    addFileAttachments(Array.from(event.dataTransfer?.files ?? []))
  }

  return {
    removeAttachment,
    fileInputRef,
    handleFileSelect,
    handlePaste,
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    effects: {},
  }
}
