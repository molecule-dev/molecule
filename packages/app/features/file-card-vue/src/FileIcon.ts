/**
 * Vue file-kind icon — a stroke-currentColor SVG glyph keyed by `FileKind`.
 *
 * Vue counterpart of `@molecule/app-file-card-react`'s `FileIcon` — the same
 * props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import type { FileKind } from './types.js'

/**
 * Single-element SVG path data for each `FileKind`. Stroke-only outlines
 * keep the icon legible at small sizes and match common file-manager
 * conventions (image = mountain, video = play, audio = note, document =
 * page, archive = box, code = brackets, folder = tab, other = sheet).
 */
const PATHS: Record<FileKind, VNode[]> = {
  image: [
    h('rect', { x: '3', y: '5', width: '18', height: '14', rx: '2' }),
    h('circle', { cx: '8.5', cy: '10.5', r: '1.5' }),
    h('path', { d: 'm21 15-5-5L5 21' }),
  ],
  video: [
    h('rect', { x: '3', y: '5', width: '18', height: '14', rx: '2' }),
    h('path', { d: 'm10 9 5 3-5 3z', fill: 'currentColor' }),
  ],
  audio: [
    h('path', { d: 'M9 18V5l12-2v13' }),
    h('circle', { cx: '6', cy: '18', r: '3' }),
    h('circle', { cx: '18', cy: '16', r: '3' }),
  ],
  document: [
    h('path', { d: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' }),
    h('path', { d: 'M14 3v6h6' }),
  ],
  archive: [
    h('rect', { x: '3', y: '3', width: '18', height: '6', rx: '1' }),
    h('path', { d: 'M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9' }),
    h('path', { d: 'M10 13h4' }),
  ],
  code: [
    h('path', { d: 'm9 8-5 4 5 4' }),
    h('path', { d: 'm15 8 5 4-5 4' }),
    h('path', { d: 'm13 5-2 14' }),
  ],
  folder: [
    h('path', {
      d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    }),
  ],
  other: [
    h('path', { d: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' }),
    h('path', { d: 'M14 3v6h6' }),
    h('path', { d: 'M9 14h6' }),
    h('path', { d: 'M9 17h4' }),
  ],
}

/**
 * Icon glyph for a file kind. Stroke-currentColor SVG so it inherits the
 * surrounding text color (no ClassMap colors needed).
 *
 * @param props - Component props (see {@link FileIconProps}).
 * @returns The SVG icon component.
 */
export const FileIcon = defineComponent({
  name: 'FileIcon',
  props: {
    kind: {
      type: String as PropType<FileKind>,
      required: true,
    },
    size: {
      type: Number,
      default: undefined,
    },
    ariaLabel: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    return (): VNode =>
      h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          width: props.size ?? 24,
          height: props.size ?? 24,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.75,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          role: props.ariaLabel ? 'img' : undefined,
          'aria-label': props.ariaLabel,
          'aria-hidden': props.ariaLabel ? undefined : true,
          'data-mol-id': `file-icon-${props.kind}`,
        },
        PATHS[props.kind],
      )
  },
})
