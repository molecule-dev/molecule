/**
 * Types for the Svelte video-call controls.
 *
 * @module
 */

import type { Snippet } from 'svelte'

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
  /** Additional buttons to render before the leave button — a snippet or a plain string. */
  extraControls?: Snippet | string
  /** Extra classes. */
  className?: string
}

/** Props for the {@link ParticipantTile} component. */
export interface ParticipantTileProps {
  /** Participant display name — a snippet or a plain string. */
  name: Snippet | string
  /** Optional video stream slot — a snippet rendering the app's `<video>` element. */
  videoSlot?: Snippet | string
  /** Optional avatar shown when video is off — a snippet or a plain string. */
  avatarSlot?: Snippet | string
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
