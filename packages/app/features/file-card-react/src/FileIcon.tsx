import type { JSX } from 'react'

import { Circle, Path, Rect, type ShapeNode, Svg } from '@molecule/app-ui-react/elements'

/**
 * Supported file kinds. Drives icon selection and the "<kind>" portion of
 * the aria label translation key (e.g. `file-card.kind.image`).
 */
export type FileKind =
  'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'folder' | 'other'

/** Props for `<FileIcon>`. */
export interface FileIconProps {
  /** File kind — picks the SVG glyph. */
  kind: FileKind
  /** Pixel size of the rendered SVG (default 24). */
  size?: number
  /** Optional aria-label. When omitted the icon is `aria-hidden`. */
  ariaLabel?: string
}

/**
 * Single-element SVG path data for each `FileKind`. Stroke-only outlines
 * keep the icon legible at small sizes and match common file-manager
 * conventions (image = mountain, video = play, audio = note, document =
 * page, archive = box, code = brackets, folder = tab, other = sheet).
 */
const PATHS: Record<FileKind, ShapeNode> = {
  image: (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={8.5} cy={10.5} r={1.5} />
      <Path d="m21 15-5-5L5 21" />
    </>
  ),
  video: (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="m10 9 5 3-5 3z" fill="currentColor" />
    </>
  ),
  audio: (
    <>
      <Path d="M9 18V5l12-2v13" />
      <Circle cx={6} cy={18} r={3} />
      <Circle cx={18} cy={16} r={3} />
    </>
  ),
  document: (
    <>
      <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <Path d="M14 3v6h6" />
    </>
  ),
  archive: (
    <>
      <Rect x={3} y={3} width={18} height={6} rx={1} />
      <Path d="M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" />
      <Path d="M10 13h4" />
    </>
  ),
  code: (
    <>
      <Path d="m9 8-5 4 5 4" />
      <Path d="m15 8 5 4-5 4" />
      <Path d="m13 5-2 14" />
    </>
  ),
  folder: (
    <>
      <Path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  other: (
    <>
      <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <Path d="M14 3v6h6" />
      <Path d="M9 14h6" />
      <Path d="M9 17h4" />
    </>
  ),
}

/**
 * Icon glyph for a file kind. Stroke-currentColor SVG so it inherits the
 * surrounding text color (no ClassMap colors needed).
 *
 * @param props - Component props.
 * @param props.kind - File kind.
 * @param props.size - Pixel size (default 24).
 * @param props.ariaLabel - Optional aria-label; when omitted the icon is decorative.
 * @returns The SVG icon element.
 */
export function FileIcon({ kind, size = 24, ariaLabel }: FileIconProps): JSX.Element {
  return (
    <Svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      data-mol-id={`file-icon-${kind}`}
    >
      {PATHS[kind]}
    </Svg>
  )
}
