import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for the {@link ParticipantTile} component. */
export interface ParticipantTileProps {
  /** Participant display name. */
  name: ReactNode
  /** Optional video stream slot — `<video>` element supplied by the app. */
  videoSlot?: ReactNode
  /** Optional avatar shown when video is off. */
  avatarSlot?: ReactNode
  /** Audio enabled (renders muted indicator when false). */
  audioEnabled?: boolean
  /** Hand-raised indicator. */
  handRaised?: boolean
  /** Whether this participant is currently speaking. */
  speaking?: boolean
  /** Whether this is the local user. */
  isLocal?: boolean
  /** Extra classes on the tile wrapper. */
  className?: string
}

/**
 * Single participant tile for a video grid. Apps supply the video
 * element via `videoSlot`; this component renders the surrounding
 * chrome (name badge, mute indicator, hand-raised, speaking ring).
 * @param props - Component props (see {@link ParticipantTileProps}).
 */
export function ParticipantTile({
  name,
  videoSlot,
  avatarSlot,
  audioEnabled = true,
  handRaised,
  speaking,
  isLocal,
  className,
}: ParticipantTileProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Box
      as="div"
      className={cm.cn(
        cm.position('relative'),
        cm.surface,
        speaking ? cm.textTone('success') : undefined,
        className,
      )}
      /* mol-bespoke-tile: the tile's canvas, not theme chrome — the caller
         fills it with a `<video>`; the background/ink come from `cm.surface`
         and the theme, and the speaking ring is a status outline whose colour
         rides the success tone (`cm.textTone('success')` sets the element's
         ink; `currentColor` paints the ring with it). */
      style={{ borderRadius: 8, overflow: 'hidden' }}
      webStyle={{ aspectRatio: '16 / 9', outline: speaking ? '3px solid currentColor' : undefined }}
    >
      <Box
        as="div"
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        webStyle={{ inset: 0 }}
      >
        {videoSlot ?? avatarSlot}
      </Box>
      <Box
        as="div"
        className={cm.cn(cm.bgScrim, cm.textOnTone)}
        style={{ position: 'absolute', left: 8, bottom: 8, borderRadius: 4 }}
        webStyle={{ padding: '2px 6px', fontSize: 12 }}
      >
        {name}
        {isLocal ? ` ${t('call.label.you', {}, { defaultValue: '(you)' })}` : ''}
      </Box>
      <Box as="div" style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
        {!audioEnabled && (
          <Text
            as="span"
            aria-label={t('call.aria.muted', {}, { defaultValue: 'Muted' })}
            style={{ fontSize: 12 }}
          >
            🔇
          </Text>
        )}
        {handRaised && (
          <Text
            as="span"
            aria-label={t('call.aria.handRaised', {}, { defaultValue: 'Hand raised' })}
            style={{ fontSize: 12 }}
          >
            ✋
          </Text>
        )}
      </Box>
    </Box>
  )
}
