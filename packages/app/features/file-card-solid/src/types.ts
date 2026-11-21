/**
 * Types for the Solid file card primitives — the same shapes
 * `@molecule/app-file-card-react` exports, with Solid's node type for the
 * actions slot.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * Supported file kinds. Drives icon selection and the "<kind>" portion of
 * the aria label translation key (e.g. `file-card.kind.image`).
 */
export type FileKind =
  'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'folder' | 'other'

/**
 * Minimal description of a file shown in a `<FileCard>`. Apps map their own
 * domain types onto this shape — there is no required mime field; pass
 * `kind` instead so the icon matches even when only a filename is known.
 */
export interface FileSummary {
  /** Stable identifier for the file (parent key + `data-mol-id` suffix). */
  id: string
  /** Display name (filename including extension). */
  name: string
  /** Size in bytes. Pass `0` for folders or unknown. */
  size: number
  /** File kind — drives the icon and the "kind" aria token. */
  kind: FileKind
  /** Last-modified timestamp (ISO string, ms epoch, or `Date`). Optional. */
  modifiedAt?: string | number | Date
  /** Optional thumbnail URL. When set, replaces the icon in `'grid'` layout. */
  thumbnail?: string
}

/** Props for `<FileCard>`. */
export interface FileCardProps {
  /** The file to render. */
  file: FileSummary
  /** Selected highlight state. */
  selected?: boolean
  /**
   * Handler fired when the card body is activated: a click anywhere on it, or
   * Enter / Space on its select button (a transparent button covering the card,
   * with `aria-pressed` for `selected`). Not fired for the actions slot, which
   * sits above that button.
   */
  onClick?: (file: FileSummary, event: MouseEvent) => void
  /** Context-menu (right-click) handler. */
  onContextMenu?: (file: FileSummary, event: MouseEvent) => void
  /** Layout — `'grid'` (default) is a square tile, `'row'` is a horizontal list line. */
  layout?: 'grid' | 'row'
  /** Optional trailing action slot (button row, kebab menu). Clicks here do not fire `onClick`. */
  actions?: JSX.Element
  /** Reference "now" for relative-time formatting. Useful for testing/snapshots. */
  now?: Date
  /** Extra classes merged onto the root element. */
  className?: string
  /** Override the root `data-mol-id` (defaults to `file-card-${file.id}`). */
  dataMolId?: string
}

/** Props for `<FileIcon>`. */
export interface FileIconProps {
  /** File kind — picks the SVG glyph. */
  kind: FileKind
  /** Pixel size of the rendered SVG (default 24). */
  size?: number
  /** Optional aria-label. When omitted the icon is `aria-hidden`. */
  ariaLabel?: string
}
