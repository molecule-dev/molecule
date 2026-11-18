/**
 * Types for the Vue editable image gallery.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

import type { IconName } from '@molecule/app-icons'

/**
 * Props accepted by {@link ImageGalleryEditor} — the same props
 * `@molecule/app-image-gallery-editor-react` accepts. Node-valued props
 * (`header`, `counter`, `dropZoneTitle`, `dropZoneHint`, `statusMessage`)
 * take a Vue `VNodeChild` (or a string) instead of a React node, and may
 * also arrive as a same-named slot.
 */
export interface ImageGalleryEditorProps {
  /** Ordered slots, `null` for empty. Length determines slot count. */
  slots: (string | null)[]
  /** Called with the next slots array when a slot is filled or removed. */
  onChange: (slots: (string | null)[]) => void
  /** Called when the user picks files; defaults to a local object URL. */
  onPickFiles?: (files: FileList) => Promise<(string | null)[]> | (string | null)[]
  /** The highest slot index a drop may fill (default 24). */
  maxImages?: number
  /** Header heading + subtitle slot (renders left of the photo counter). */
  header?: VNodeChild
  /** Photo-counter label (e.g. "3 / 24 Photos"). */
  counter?: VNodeChild
  /** Drop-zone heading. Defaults through i18n (English "Drag and drop assets here"). */
  dropZoneTitle?: VNodeChild
  /** Drop-zone hint. Defaults through i18n (English "or click to browse local files"). */
  dropZoneHint?: VNodeChild
  /** Remove-confirmation message. Defaults through i18n (English "Remove this image?"). */
  confirmRemoveMessage?: string
  /** Status line rendered under the grid. */
  statusMessage?: VNodeChild
  /**
   * Glyph rendered in empty slots — a typed {@link IconName} from the bonded
   * `@molecule/app-icons` set (an unknown name is a type error, not a blank).
   */
  emptySlotIcon?: IconName
}
