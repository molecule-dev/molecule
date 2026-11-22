/**
 * React's `chat:attachments` regions of ChatPanel.tsx: the composer's staged
 * attachments — the hidden file input's picker, a paste and a drop, the drag
 * overlay's counter, and the chip remove that revokes an image preview.
 *
 * The staged files and the last rejection live in `chat:popups` (React keeps
 * the `useState` cells there and this region only writes them). What this region
 * owns is the file input ref, the drag counter and its `isDragOver` flag, and the
 * handlers React attaches to the panel root, the composer's `onPaste` and the
 * attachment button.
 *
 * @module
 */

import { MAX_ATTACHMENT_SIZE } from '@molecule/app-ide-panel-logic'
import type { AttachedFile } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:attachments` slice. */
export interface ChatAttachmentsSlice {
  /** Removes one attachment chip (revoking its preview URL). */
  readonly removeAttachment: (key: string) => void
  /** The hidden file input the attach button opens. */
  readonly fileInputRef: MutableRef<HTMLInputElement | null>
  /** Attaches the files the input picked. */
  readonly handleFileSelect: (event: Event) => void
  /** Attaches the files pasted into the composer. */
  readonly handlePaste: (event: ClipboardEvent) => void
  /** Whether a drag is over the panel (shows the drop overlay). */
  readonly isDragOver: boolean
  /** Accepts a drag over the panel. */
  readonly handleDragOver: (event: DragEvent) => void
  /** Counts a drag entering the panel. */
  readonly handleDragEnter: (event: DragEvent) => void
  /** Counts a drag leaving an inner layer. */
  readonly handleDragLeave: () => void
  /** Attaches a dropped file set and clears the overlay. */
  readonly handleDrop: (event: DragEvent) => void
  /** React's mount I/O for the region — none: it declares handlers and a ref. */
  mount(): void
  /** The drag-and-drop handlers React attaches to the panel's root element. */
  readonly actions: {
    /** React's `handleDragEnter`. */
    handleDragEnter: (event: DragEvent) => void
    /** React's `handleDragOver`. */
    handleDragOver: (event: DragEvent) => void
    /** React's `handleDragLeave`. */
    handleDragLeave: () => void
    /** React's `handleDrop`. */
    handleDrop: (event: DragEvent) => void
  }
}

/**
 * Creates the `chat:attachments` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The attachment handlers, the drag state and the file input ref.
 */
export function createChatAttachments(ctx: ChatContext): ChatAttachmentsSlice {
  /** React's `fileInputRef` — the hidden `<input type="file">`. */
  const fileInputRef: MutableRef<HTMLInputElement | null> = { current: null }
  /** React's `dragCounterRef` — enter/leave depth, so an inner leave keeps the overlay. */
  const dragCounterRef: MutableRef<number> = { current: 0 }
  /** React's `isDragOver` state. */
  let isDragOver = $state(false)

  /**
   * Stages a file set, clearing the last rejection first and refusing anything
   * over {@link MAX_ATTACHMENT_SIZE} with the too-large message.
   *
   * @param files - The files to stage.
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
   * React's `handleFileSelect`: stages the picked files, then clears the input
   * so picking the same file again still fires a change.
   *
   * @param event - The file input's change event.
   */
  const handleFileSelect = (event: Event): void => {
    const target = event.target as HTMLInputElement
    addFileAttachments(Array.from(target.files ?? []))
    target.value = ''
  }

  /**
   * React's `handlePaste`: stages the clipboard's file items and keeps the
   * browser's default paste whenever the clipboard carries no file.
   *
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
   * React's `handleDragOver`: accepts the drop so the browser fires it.
   *
   * @param event - The drag event.
   */
  const handleDragOver = (event: DragEvent): void => {
    event.preventDefault()
  }

  /**
   * React's `handleDragEnter`: counts the layer and shows the overlay.
   *
   * @param event - The drag event.
   */
  const handleDragEnter = (event: DragEvent): void => {
    event.preventDefault()
    dragCounterRef.current++
    isDragOver = true
  }

  /** React's `handleDragLeave`: hides the overlay only once every layer left. */
  const handleDragLeave = (): void => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      isDragOver = false
    }
  }

  /**
   * React's `handleDrop`: stages the dropped files and clears the overlay.
   *
   * @param event - The drop event.
   */
  const handleDrop = (event: DragEvent): void => {
    event.preventDefault()
    dragCounterRef.current = 0
    isDragOver = false
    addFileAttachments(Array.from(event.dataTransfer?.files ?? []))
  }

  /**
   * React's `removeAttachment`: revokes an image preview, then drops the chip.
   *
   * @param key - The chip key (its path, else its filename).
   */
  const removeAttachment = (key: string): void => {
    const previous = ctx.popups.attachedFiles
    const removed = previous.find((file) => (file.path ?? file.filename) === key)
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
    ctx.popups.setAttachedFiles(previous.filter((file) => (file.path ?? file.filename) !== key))
  }

  return {
    removeAttachment,
    fileInputRef,
    handleFileSelect,
    handlePaste,
    get isDragOver(): boolean {
      return isDragOver
    },
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    mount(): void {
      // React's region declares handlers and a ref only; no mount I/O to repeat.
    },
    actions: {
      handleDragEnter,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    },
  }
}
