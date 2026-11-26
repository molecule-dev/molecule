/**
 * Types of `@molecule/app-file-dropzone-angular` — the Angular counterpart of
 * `@molecule/app-file-dropzone-react`, same props and DOM.
 *
 * @module
 */

import type { PickedFile } from '@molecule/app-filesystem'

/**
 * Props accepted by {@link FileDropzone} — the same props
 * `@molecule/app-file-dropzone-react` accepts. The node prop (`children`) is
 * projected content in Angular (an input cannot carry a node), so it is typed
 * `unknown`: pass it in the host template, not as a value.
 */
export interface FileDropzoneProps {
  /** Called with the files the user selected or dropped, in selection order. */
  onFiles: (files: readonly PickedFile[]) => void
  /** Accept attribute (e.g. `'image/*'` or `'.pdf,.docx'`). */
  accept?: string
  /** Allow multi-file selection. Defaults to false. */
  multiple?: boolean
  /** Max file size in bytes. Files exceeding are rejected. */
  maxSize?: number
  /** Called with rejected files (wrong type or size). */
  onRejected?: (files: readonly PickedFile[]) => void
  /** Content rendered inside the dropzone, projected as the element's default content. */
  children?: unknown
  /** Disabled state. */
  disabled?: boolean
  /** Extra classes on the dropzone wrapper. */
  className?: string
}
