/**
 * Solid participant tile for a video grid.
 *
 * Solid counterpart of `@molecule/app-video-call-controls-react`'s
 * `ParticipantTile` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ParticipantTileProps } from './types.js'

/** The centered media layer's inline style, exactly as React writes it. */
const CENTER_STYLE =
  'position: absolute; inset: 0px; display: flex; align-items: center; justify-content: center'

/** The name badge's inline style, exactly as React writes it. */
const BADGE_STYLE =
  'position: absolute; left: 8px; bottom: 8px; padding: 2px 6px; border-radius: 4px; font-size: 12px'

/** The indicators row's inline style, exactly as React writes it. */
const INDICATORS_STYLE = 'position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px'

/** One indicator glyph's inline style, exactly as React writes it. */
const ICON_STYLE = 'font-size: 12px'

/**
 * Single participant tile for a video grid. Apps supply the video element via
 * `videoSlot`; this component renders the surrounding chrome (name badge, mute
 * indicator, hand-raised, speaking ring).
 *
 * Tiles are fixed 16:9 theme surfaces (`cm.surface` background, theme ink) with
 * a scrim name badge (`cm.bgScrim`, inverse text) and a success-tone speaking
 * ring (`cm.textTone('success')` ink, `currentColor` outline); supply the
 * `<video>` element via `videoSlot` and a fallback via `avatarSlot`.
 *
 * @param props - Component props (see {@link ParticipantTileProps}).
 * @returns The rendered participant tile.
 */
export const ParticipantTile: Component<ParticipantTileProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  /** React's `audioEnabled = true` default. */
  const audioEnabled = (): boolean => props.audioEnabled ?? true
  const classes = (): string =>
    cm.cn(
      cm.position('relative'),
      cm.surface,
      props.speaking ? cm.textTone('success') : undefined,
      props.className,
    )
  const rootStyle = (): string =>
    [
      'aspect-ratio: 16 / 9',
      'border-radius: 8px',
      'overflow: hidden',
      ...(props.speaking ? ['outline: 3px solid currentColor'] : []),
    ].join('; ')
  /** React's `videoSlot ?? avatarSlot`: the video wins when supplied. */
  const media = (): JSX.Element => (props.videoSlot ?? props.avatarSlot) as JSX.Element
  return (
    <div class={classes()} style={rootStyle()}>
      <div style={CENTER_STYLE}>{media()}</div>
      <div class={cm.cn(cm.bgScrim, cm.textOnTone)} style={BADGE_STYLE}>
        {props.name}
        {props.isLocal ? ` ${t('call.label.you', {}, { defaultValue: '(you)' })}` : ''}
      </div>
      <div style={INDICATORS_STYLE}>
        {!audioEnabled() && (
          <span aria-label={t('call.aria.muted', {}, { defaultValue: 'Muted' })} style={ICON_STYLE}>
            🔇
          </span>
        )}
        {props.handRaised && (
          <span
            aria-label={t('call.aria.handRaised', {}, { defaultValue: 'Hand raised' })}
            style={ICON_STYLE}
          >
            ✋
          </span>
        )}
      </div>
    </div>
  )
}
