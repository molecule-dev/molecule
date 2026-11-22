/**
 * `chat:attachments` — staging files into the composer, ported from React's two
 * `chat:attachments` regions: the hidden file input, the drag-and-drop targets
 * and the paste handler.
 *
 * The staged files themselves live in `chat:popups` (React declares that state
 * there and both this slice and the submit path read it); this slice owns the
 * drag counter, the overlay flag and the handlers that turn drops, pastes and
 * input picks into attachments.
 *
 * @module
 */

import { type Ref, ref } from 'vue'

import { MAX_ATTACHMENT_SIZE } from '@molecule/app-ide-panel-logic'
import type { AttachedFile } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, MutableRef } from './context.js'

/** What the `chat:attachments` slice exposes. */
export interface ChatAttachmentsSlice {
  /** The chat root's `dragenter` handler. */
  readonly handleDragEnter: (event: DragEvent) => void
  /** The chat root's `dragover` handler. */
  readonly handleDragOver: (event: DragEvent) => void
  /** The chat root's `dragleave` handler. */
  readonly handleDragLeave: () => void
  /** The chat root's `drop` handler. */
  readonly handleDrop: (event: DragEvent) => void
  /** Whether a drag is hovering the chat (drives the overlay). */
  readonly isDragOver: Ref<boolean>
  /** Removes one staged attachment by key. */
  readonly removeAttachment: (key: string) => void
  /** The hidden file input. */
  readonly fileInputRef: MutableRef<HTMLInputElement | null>
  /** Stages the files picked in the input. */
  readonly handleFileSelect: (event: Event) => void
  /** Stages files pasted into the composer. */
  readonly handlePaste: (event: Event) => void
}

/**
 * Builds the `chat:attachments` slice.
 *
 * @param ctx - The panel context (the staged attachments, the attachment error
 *   and the translations live there).
 * @returns The attachments slice.
 */
export function createChatAttachments(ctx: ChatCtx): ChatAttachmentsSlice {
  const isDragOver = ref(false)
  const dragCounterRef: MutableRef<number> = { current: 0 }
  const fileInputRef: MutableRef<HTMLInputElement | null> = { current: null }

  /**
   * Stages browser files, rejecting any over the size limit with a banner.
   *
   * @param files - The files to stage, in the order they arrived.
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
   * Stages the files the hidden input picked and resets the input.
   *
   * @param event - The input's change event.
   */
  const handleFileSelect = (event: Event): void => {
    const input = event.target as HTMLInputElement
    addFileAttachments(Array.from(input.files ?? []))
    input.value = ''
  }

  /**
   * Stages files pasted into the composer, leaving text-only pastes to the
   * browser.
   *
   * @param event - The composer textarea's paste event.
   */
  const handlePaste = (event: Event): void => {
    const clipboard = (event as ClipboardEvent).clipboardData
    if (!clipboard) return
    const items = Array.from(clipboard.items)
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
   * Accepts a drag so the browser does not open the file instead.
   *
   * @param event - The chat root's dragover event.
   */
  const handleDragOver = (event: DragEvent): void => {
    event.preventDefault()
  }

  /**
   * Counts a drag entering the chat and shows the overlay.
   *
   * @param event - The chat root's dragenter event.
   */
  const handleDragEnter = (event: DragEvent): void => {
    event.preventDefault()
    dragCounterRef.current++
    isDragOver.value = true
  }

  /**
   * Counts a drag leaving one layer and hides the overlay once every layer has
   * left, so a drag that only crosses an inner element keeps the overlay up.
   */
  const handleDragLeave = (): void => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      isDragOver.value = false
    }
  }

  /**
   * Accepts a drop, clears the overlay and stages the dropped files.
   *
   * @param event - The chat root's drop event.
   */
  const handleDrop = (event: DragEvent): void => {
    event.preventDefault()
    dragCounterRef.current = 0
    isDragOver.value = false
    addFileAttachments(event.dataTransfer ? Array.from(event.dataTransfer.files) : [])
  }

  /**
   * Removes one staged attachment (revoking an image preview URL first).
   *
   * @param key - The attachment's key (`path`, else `filename`).
   */
  const removeAttachment = (key: string): void => {
    ctx.popups.setAttachedFiles((prev) => {
      const removed = prev.find((f) => (f.path ?? f.filename) === key)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((f) => (f.path ?? f.filename) !== key)
    })
  }

  return {
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDragOver,
    removeAttachment,
    fileInputRef,
    handleFileSelect,
    handlePaste,
  }
}
