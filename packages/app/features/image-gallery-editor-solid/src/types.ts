/**
 * Types for the Solid editable image gallery.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { PickedFile } from '@molecule/app-filesystem'
import type { IconName } from '@molecule/app-icons'

/**
 * Props accepted by the {@link ImageGalleryEditor} component — the same props
 * `@molecule/app-image-gallery-editor-react` accepts. Node-valued props
 * (`header`, `counter`, `dropZoneTitle`, `dropZoneHint`, `statusMessage`) take
 * Solid JSX (or a string) instead of a React node.
 */
export interface ImageGalleryEditorProps {
  /** Ordered slots, `null` for empty. Length determines slot count. */
  slots: (string | null)[]
  /** Called with the next slots array when a slot is filled or removed. */
  onChange: (slots: (string | null)[]) => void
  /** Returns URLs for the ordered selection. Defaults to local previews owned by the editor. */
  onPickFiles?: (files: readonly PickedFile[]) => Promise<(string | null)[]> | (string | null)[]
  /** The highest slot index a drop may fill (default 24). */
  maxImages?: number
  /** Header heading + subtitle slot (renders left of the photo counter). */
  header?: JSX.Element
  /** Photo-counter label (e.g. "3 / 24 Photos"). */
  counter?: JSX.Element
  /** Drop-zone heading. Defaults through i18n (English "Drag and drop assets here"). */
  dropZoneTitle?: JSX.Element
  /** Drop-zone hint. Defaults through i18n (English "or click to browse local files"). */
  dropZoneHint?: JSX.Element
  /** Remove-confirmation message. Defaults through i18n (English "Remove this image?"). */
  confirmRemoveMessage?: string
  /** Status line rendered under the grid. */
  statusMessage?: JSX.Element
  /**
   * Glyph rendered in empty slots — a typed {@link IconName} from the bonded
   * `@molecule/app-icons` set (an unknown name is a type error, not a blank).
   */
  emptySlotIcon?: IconName
}
