/**
 * Types for the Svelte editable image gallery.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { PickedFile } from '@molecule/app-filesystem'
import type { IconName } from '@molecule/app-icons'

/**
 * Props accepted by the {@link ImageGalleryEditor} component — the same props
 * `@molecule/app-image-gallery-editor-react` accepts. Node-valued props
 * (`header`, `counter`, `dropZoneTitle`, `dropZoneHint`, `statusMessage`)
 * take a Svelte snippet (or a plain string) instead of a React node.
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
  header?: Snippet | string
  /** Photo-counter label (e.g. "3 / 24 Photos"): a snippet, or a plain string. */
  counter?: Snippet | string
  /** Drop-zone heading. Defaults through i18n (English "Drag and drop assets here"). */
  dropZoneTitle?: Snippet | string
  /** Drop-zone hint. Defaults through i18n (English "or click to browse local files"). */
  dropZoneHint?: Snippet | string
  /** Remove-confirmation message. Defaults through i18n (English "Remove this image?"). */
  confirmRemoveMessage?: string
  /** Status line rendered under the grid: a snippet, or a plain string. */
  statusMessage?: Snippet | string
  /**
   * Glyph rendered in empty slots — a typed {@link IconName} from the bonded
   * `@molecule/app-icons` set (an unknown name is a type error, not a blank).
   */
  emptySlotIcon?: IconName
}
