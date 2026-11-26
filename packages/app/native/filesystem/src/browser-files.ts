/**
 * Browser file selection and portable file adapters.
 *
 * @module
 */

import { filterPickedFiles } from './file-selection.js'
import type { FileSelectionOptions, PickedFile } from './types.js'

/**
 * Adapts a browser File without reading it or copying its bytes.
 *
 * @param file - The original browser File.
 * @returns A portable selection that reads and appends the original file.
 */
export function fromBrowserFile(file: File): PickedFile {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    arrayBuffer: () => file.arrayBuffer(),
    appendTo: (form, field) => form.append(field, file),
  }
}

/** Options read when the browser input or drop target receives an event. */
export interface BrowserFileInputOptions<F> extends FileSelectionOptions {
  /** Disable chooser activation and file delivery. */
  disabled?: boolean
  /** Called once for a nonempty, ordered accepted batch. */
  onFiles(files: F[]): void
  /** Called once for a nonempty, ordered rejected batch. */
  onRejected?(files: F[]): void
  /** Receives an error opening or reading the chooser. */
  onPickError?(error: Error): void
}

type Click = Pick<MouseEvent, 'target' | 'defaultPrevented'>
type KeyDown = Click & Pick<KeyboardEvent, 'key' | 'repeat' | 'preventDefault'>
type Drop = Pick<DragEvent, 'dataTransfer' | 'preventDefault'>

/** Event handlers for one browse target and its file input. */
export interface BrowserFileInputHandlers {
  /** Opens the chooser on a click outside the input itself. */
  onClick(event: Click): void
  /** Opens the chooser on Enter or Space. */
  onKeyDown(event: KeyDown): void
  /** Accepts a drag over the target if enabled, returning whether it can be highlighted. */
  onDragOver(event: Pick<DragEvent, 'preventDefault'>): boolean
  /** Snapshots and delivers the files in a drop. */
  onDrop(event: Drop): void
  /** Snapshots the input's files and clears it before delivering them. */
  onChange(): void
}

/**
 * Wires a target and a hidden input to the same file selection rules.
 *
 * @param getInput - Reads the mounted file input.
 * @param getOptions - Reads the current props and callbacks.
 * @param adapt - Maps a browser File to the caller's value.
 * @returns Handlers to bind to the target and its input.
 */
export function createBrowserFileInput<F>(
  getInput: () => HTMLInputElement | null | undefined,
  getOptions: () => BrowserFileInputOptions<F>,
  adapt: (file: File) => F,
): BrowserFileInputHandlers {
  /**
   * Reports a chooser failure through the current callback.
   * @param options - The current picker options.
   * @param error - The failure from the browser.
   */
  function reportError(options: BrowserFileInputOptions<F>, error: unknown): void {
    if (!options.onPickError) throw error
    options.onPickError(error instanceof Error ? error : new Error(String(error)))
  }

  /**
   * Opens the input without re-entering on its own bubbling click.
   * @param event - The event that activated the target.
   * @param keyboard - The keyboard event if the activation came from a key.
   */
  function open(event: Click, keyboard?: KeyDown): void {
    const input = getInput()
    const options = getOptions()
    if (!input || options.disabled || event.defaultPrevented || event.target === input) return
    keyboard?.preventDefault()
    if (keyboard?.repeat) return
    try {
      input.click()
    } catch (error) {
      reportError(options, error)
    }
  }

  /**
   * Reads the files synchronously and delivers the accepted and rejected batches.
   * @param read - Reads the current event's files.
   * @param options - The current picker options.
   */
  function deliver(read: () => File[], options: BrowserFileInputOptions<F>): void {
    let accepted: File[]
    let rejected: File[]
    try {
      const files = read()
      if (options.disabled) return
      ;({ accepted, rejected } = filterPickedFiles(files, options))
    } catch (error) {
      reportError(options, error)
      return
    }
    if (accepted.length) options.onFiles(accepted.map(adapt))
    if (rejected.length) options.onRejected?.(rejected.map(adapt))
  }

  return {
    onClick: (event) => open(event),
    onKeyDown(event) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        open(event, event)
      }
    },
    onDragOver(event) {
      if (getOptions().disabled) return false
      event.preventDefault()
      return true
    },
    onDrop(event) {
      event.preventDefault()
      const options = getOptions()
      if (!options.disabled) deliver(() => Array.from(event.dataTransfer?.files ?? []), options)
    },
    onChange() {
      const input = getInput()
      if (!input) return
      deliver(() => {
        const files = Array.from(input.files ?? [])
        input.value = ''
        return files
      }, getOptions())
    },
  }
}
