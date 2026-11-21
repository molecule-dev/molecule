/**
 * Solid slide thumbnail tile for presentation editors / slideshow navigators.
 *
 * Solid counterpart of `@molecule/app-slide-thumbnail-react`'s
 * `SlideThumbnail` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { SlideThumbnailProps } from './types.js'

/**
 * The inline style React puts on the tile: the caller's width, the aspect
 * ratio, and the active outline. The canvas colour comes from `cm.surface`.
 *
 * @param width - The tile width in pixels.
 * @param aspect - The aspect ratio (`16/9`, `4/3`, `1/1`).
 * @param active - Whether the tile is the active slide.
 * @returns The React-shaped style object (kebab-case keys, as Solid applies it).
 */
const rootStyle = (width: number, aspect: string, active: boolean): Record<string, string> => ({
  width: `${width}px`,
  'aspect-ratio': aspect.replace('/', ' / '),
  outline: active ? '2px solid currentColor' : 'none',
  'outline-offset': '2px',
  overflow: 'hidden',
  border: 'none',
  padding: '0',
})

/**
 * The index badge's inline style (absolute top-left). Its colours come from
 * the theme scrim (`cm.bgScrim`) with the theme's inverse text (`cm.textOnTone`).
 */
const badgeStyle: Record<string, string> = {
  position: 'absolute',
  left: '4px',
  top: '4px',
  padding: '0 4px',
  'font-size': '10px',
  'font-weight': '700',
  'border-radius': '3px',
}

/**
 * Slide thumbnail tile for presentation editors / slideshow navigators.
 * Apps render the live scaled-down preview as children; this component
 * provides the surrounding chrome (active outline + index label).
 *
 * @param props - Component props (see {@link SlideThumbnailProps}).
 * @returns The rendered slide thumbnail.
 */
export const SlideThumbnail: Component<SlideThumbnailProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={(event) => props.onClick?.(event)}
      aria-current={props.active ? 'true' : undefined}
      data-mol-id="slide-thumbnail"
      data-slide-index={props.index}
      aria-label={t(
        'slideThumbnail.label',
        { index: props.index },
        { defaultValue: 'Slide {{index}}' },
      )}
      class={cm.cn(cm.position('relative'), cm.cursorPointer, cm.surface, props.className)}
      style={rootStyle(props.width ?? 160, props.aspect ?? '16/9', props.active ?? false)}
    >
      {props.children}
      <span class={cm.cn(cm.bgScrim, cm.textOnTone)} style={badgeStyle}>
        {props.index}
      </span>
    </button>
  )
}
