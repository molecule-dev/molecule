/**
 * Types for the Solid video-call controls.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for the {@link VideoCallControls} component. */
export interface VideoCallControlsProps {
  /** Whether the local microphone is on. */
  audioEnabled: boolean
  /** Called when the mute button is pressed. */
  onToggleAudio: () => void
  /** Whether the local camera is on. */
  videoEnabled: boolean
  /** Called when the camera button is pressed. */
  onToggleVideo: () => void
  /** Whether the local screen share is running. */
  screenSharing?: boolean
  /** Called when the screen-share button is pressed (the button renders only when this is set). */
  onToggleScreenShare?: () => void
  /** Called when the leave button is pressed. */
  onLeave: () => void
  /** Additional buttons to render before the leave button (chat, participants, etc.). */
  extraControls?: JSX.Element
  /** Extra classes. */
  className?: string
}

/** Props for the {@link ParticipantTile} component. */
export interface ParticipantTileProps {
  /** Participant display name. */
  name: JSX.Element
  /** Optional video stream slot — `<video>` element supplied by the app. */
  videoSlot?: JSX.Element
  /** Optional avatar shown when video is off. */
  avatarSlot?: JSX.Element
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
