/**
 * FileIcon component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { FileKind } from './types.js'

/**
 * FileIcon component.
 *
 * Icon glyph for a file kind. Stroke-currentColor SVG so it inherits the
 * surrounding text color (no ClassMap colors needed). The host IS the `<svg>`
 * (`svg[mol-file-icon]`), matching React's root exactly.
 */
@Component({
  selector: 'svg[mol-file-icon]',
  standalone: true,
  inputs: ['kind', 'size', 'ariaLabel'],
  host: {
    '[attr.xmlns]': '"http://www.w3.org/2000/svg"',
    '[attr.width]': 'attrSize()',
    '[attr.height]': 'attrSize()',
    '[attr.viewBox]': '"0 0 24 24"',
    '[attr.fill]': '"none"',
    '[attr.stroke]': '"currentColor"',
    '[attr.stroke-width]': '1.75',
    '[attr.stroke-linecap]': '"round"',
    '[attr.stroke-linejoin]': '"round"',
    '[attr.role]': 'ariaLabel ? "img" : null',
    '[attr.aria-label]': 'ariaLabel ?? null',
    '[attr.aria-hidden]': 'ariaLabel ? null : true',
    '[attr.data-mol-id]': '"file-icon-" + kind',
  },
  // The glyphs are inline in the template, one @case per FileKind, so the
  // rendered elements match React's PATHS exactly (SVG child elements need
  // the svg: namespace prefix under an SVG host).
  // prettier-ignore
  template: `@switch (kind) {
@case ('image') {<svg:rect x="3" y="5" width="18" height="14" rx="2" /><svg:circle cx="8.5" cy="10.5" r="1.5" /><svg:path d="m21 15-5-5L5 21" />}
@case ('video') {<svg:rect x="3" y="5" width="18" height="14" rx="2" /><svg:path d="m10 9 5 3-5 3z" fill="currentColor" />}
@case ('audio') {<svg:path d="M9 18V5l12-2v13" /><svg:circle cx="6" cy="18" r="3" /><svg:circle cx="18" cy="16" r="3" />}
@case ('document') {<svg:path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><svg:path d="M14 3v6h6" />}
@case ('archive') {<svg:rect x="3" y="3" width="18" height="6" rx="1" /><svg:path d="M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" /><svg:path d="M10 13h4" />}
@case ('code') {<svg:path d="m9 8-5 4 5 4" /><svg:path d="m15 8 5 4-5 4" /><svg:path d="m13 5-2 14" />}
@case ('folder') {<svg:path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
@case ('other') {<svg:path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><svg:path d="M14 3v6h6" /><svg:path d="M9 14h6" /><svg:path d="M9 17h4" />}
}`,
})
export class FileIcon {
  /** File kind — picks the SVG glyph. */
  kind!: FileKind
  /** Pixel size of the rendered SVG (default 24). */
  size?: number
  /** Optional aria-label. When omitted the icon is `aria-hidden`. */
  ariaLabel?: string

  /**
   * The rendered size (React's `size = 24` default parameter: a later-bound
   * write of `undefined` must not erase the default).
   * @returns The pixel size.
   */
  attrSize(): number {
    return this.size ?? 24
  }
}
