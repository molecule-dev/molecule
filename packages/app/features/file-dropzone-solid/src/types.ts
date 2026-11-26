/**
 * Props for the Solid `FileDropzone` — the same props (React names) as
 * `@molecule/app-file-dropzone-react`'s `FileDropzoneProps`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { PickedFile } from '@molecule/app-filesystem'

/** Props for {@link FileDropzone}. */
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
  /** Optional content rendered inside the dropzone (defaults to standard upload copy). */
  children?: JSX.Element
  /** Disabled state. */
  disabled?: boolean
  /** Extra classes on the dropzone wrapper. */
  className?: string
}
