import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

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
  return (
    <div
      className={cm.cn(cm.position('relative'), className)}
      style={{
        aspectRatio: '16 / 9',
        background: '#111',
        color: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        outline: speaking ? '3px solid #22c55e' : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {videoSlot ?? avatarSlot}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 12,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
        }}
      >
        {name}
        {isLocal ? ' (you)' : ''}
      </div>
      <div style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
        {!audioEnabled && (
          <span aria-label="Muted" style={{ fontSize: 12 }}>
            🔇
          </span>
        )}
        {handRaised && (
          <span aria-label="Hand raised" style={{ fontSize: 12 }}>
            ✋
          </span>
        )}
      </div>
    </div>
  )
}
