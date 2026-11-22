/**
 * React's two `chat:attachments` regions of ChatPanel.tsx (lines 2819–2827 and
 * 3176–3263): the staged attachment chips' remove action and the file
 * attachment handlers behind the composer.
 *
 * A file is staged as an {@link AttachedFile}: the browser `File`, its name,
 * MIME type, size and — for an image — an object URL the remove path revokes.
 * A file larger than {@link MAX_ATTACHMENT_SIZE} is refused with the too-large
 * banner instead of attaching; every staged file clears that banner first, and
 * a drop resets the drag counter and closes the overlay.
 *
 * The region declares no effects: `mount()` is inert, and the drag handlers are
 * bound on the inner chat's root element, the paste handler on the composer's
 * textarea.
 *
 * @module
 */

import { inject, Injectable, signal } from '@angular/core'

import { MAX_ATTACHMENT_SIZE } from '@molecule/app-ide-panel-logic'
import type { AttachedFile } from '@molecule/app-ide-panel-logic/panels'

import { ChatInnerState } from './chat-inner-state.js'
import { ChatPopups } from './chat-popups.slice.js'

/** The identifiers other slices and sections read from the `chat:attachments` slice. */
export interface ChatAttachmentsSlice {
  /** React's mount I/O for the region (none: the region declares callbacks and state only). */
  mount(): void
  /** React's root `onDragEnter` — starts the drag overlay. */
  handleDragEnter(event: DragEvent): void
  /** React's root `onDragOver` — keeps the event accepting a drop. */
  handleDragOver(event: DragEvent): void
  /** React's root `onDragLeave` — clears the drag overlay. */
  handleDragLeave(event: DragEvent): void
  /** React's root `onDrop` — attaches the dropped files. */
  handleDrop(event: DragEvent): void
  /** Whether a drag is hovering the chat (drives the overlay). */
  readonly isDragOver: () => boolean
  /** Removes one staged attachment by key. */
  readonly removeAttachment: (key: string) => void
  /** The hidden file input. */
  readonly fileInputRef: { current: HTMLInputElement | null }
  /** Stages the files picked in the input. */
  readonly handleFileSelect: (event: Event) => void
  /** Stages files pasted into the composer. */
  readonly handlePaste: (event: ClipboardEvent) => void
}

/** React's `chat:attachments` slice: staging files as attachment chips. */
@Injectable()
export class ChatAttachments implements ChatAttachmentsSlice {
  /** The shared state, read for the env (the translator). */
  private readonly state = inject(ChatInnerState)

  /** Whether a drag is hovering the chat (React's `isDragOver` state). */
  readonly isDragOver = signal(false)

  /** The hidden file input React attaches to the composer. */
  readonly fileInputRef: { current: HTMLInputElement | null } = { current: null }

  /** The nested enter/leave depth (React's `dragCounterRef`). */
  private readonly dragCounterRef: { current: number } = { current: 0 }

  /** React's mount I/O for the regions: the region declares callbacks and state only. */
  mount(): void {
    // No mount I/O in `chat:attachments`: React declares state and callbacks.
  }

  /**
   * React's root `onDragEnter`: count the enter and raise the overlay.
   *
   * @param event - The drag event.
   */
  handleDragEnter(event: DragEvent): void {
    event.preventDefault()
    this.dragCounterRef.current++
    this.isDragOver.set(true)
  }

  /**
   * React's root `onDragOver`: keep the event accepting a drop.
   *
   * @param event - The drag event.
   */
  handleDragOver(event: DragEvent): void {
    event.preventDefault()
  }

  /**
   * React's root `onDragLeave`: drop one enter level, hiding the overlay at zero.
   *
   * @param _event - The drag event React's handler takes but does not read.
   */
  handleDragLeave(_event: DragEvent): void {
    this.dragCounterRef.current--
    if (this.dragCounterRef.current === 0) {
      this.isDragOver.set(false)
    }
  }

  /**
   * React's root `onDrop`: reset the drag state and attach the dropped files.
   *
   * @param event - The drop event.
   */
  handleDrop(event: DragEvent): void {
    event.preventDefault()
    this.dragCounterRef.current = 0
    this.isDragOver.set(false)
    this.addFileAttachments(Array.from(event.dataTransfer?.files ?? []))
  }

  /**
   * React's input `onChange`: stage the picked files, then empty the input so
   * the same file can be picked again.
   *
   * @param event - The input's change event.
   */
  readonly handleFileSelect = (event: Event): void => {
    const input = event.target as HTMLInputElement
    this.addFileAttachments(Array.from(input.files ?? []))
    input.value = ''
  }

  /**
   * React's textarea `onPaste`: stage any files the clipboard carries, leaving
   * a text-only paste to the browser.
   *
   * @param event - The paste event.
   */
  readonly handlePaste = (event: ClipboardEvent): void => {
    const items = Array.from(event.clipboardData?.items ?? [])
    const fileItems = items.filter((item) => item.kind === 'file')
    if (fileItems.length === 0) return

    event.preventDefault()
    const files: File[] = []
    for (const item of fileItems) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
    this.addFileAttachments(files)
  }

  /**
   * React's `removeAttachment`: revoke an image's preview URL and drop the chip.
   *
   * @param key - The attachment's key (its path, else its filename).
   */
  readonly removeAttachment = (key: string): void => {
    this.state.slice(ChatPopups).setAttachedFiles((prev) => {
      const removed = prev.find((f) => (f.path ?? f.filename) === key)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((f) => (f.path ?? f.filename) !== key)
    })
  }

  /**
   * Stages files, refusing any over the size limit with the too-large banner
   * (React's `addFileAttachments`).
   *
   * @param files - The files to stage.
   */
  private addFileAttachments(files: File[]): void {
    const popups = this.state.slice(ChatPopups)
    popups.setAttachmentError(null)
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        popups.setAttachmentError(
          this.state.env.t(
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
      popups.setAttachedFiles((prev) => [...prev, attachment])
    }
  }
}
