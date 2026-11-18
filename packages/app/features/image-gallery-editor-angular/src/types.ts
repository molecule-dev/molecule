/**
 * Types of `@molecule/app-image-gallery-editor-angular` — the Angular
 * counterpart of `@molecule/app-image-gallery-editor-react`, same props and
 * DOM.
 *
 * @module
 */

import type { IconName } from '@molecule/app-icons'

/**
 * Props accepted by {@link ImageGalleryEditor} — the same props
 * `@molecule/app-image-gallery-editor-react` accepts. Node props (`header`,
 * `counter`, `dropZoneTitle`, `dropZoneHint`, `statusMessage`) are projected
 * content in Angular (an input cannot carry a node), so they are typed
 * `unknown`: pass them in the host template, not as values.
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
  /** Header heading + subtitle slot, projected as `[slot=header]` content. */
  header?: unknown
  /** Photo-counter label, projected as `[slot=counter]` content. */
  counter?: unknown
  /** Drop-zone heading, projected as `[slot=dropZoneTitle]` content. */
  dropZoneTitle?: unknown
  /** Drop-zone hint, projected as `[slot=dropZoneHint]` content. */
  dropZoneHint?: unknown
  /** Remove-confirmation message. Defaults through i18n (English "Remove this image?"). */
  confirmRemoveMessage?: string
  /** Status line, projected as `[slot=statusMessage]` content. */
  statusMessage?: unknown
  /**
   * Glyph rendered in empty slots — a typed {@link IconName} from the bonded
   * `@molecule/app-icons` set (an unknown name is a type error, not a blank).
   */
  emptySlotIcon?: IconName
}
