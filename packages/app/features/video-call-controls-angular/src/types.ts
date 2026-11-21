/**
 * Types of `@molecule/app-video-call-controls-angular` — the Angular
 * counterpart of `@molecule/app-video-call-controls-react`: same props and DOM.
 *
 * @module
 */

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
  /** Additional buttons to render before the leave button, projected as `[slot=extraControls]`. */
  extraControls?: unknown
  /** Extra classes. */
  className?: string
}

/**
 * Props for the {@link ParticipantTile} component — the same props
 * `@molecule/app-video-call-controls-react` accepts. Node props (`name`,
 * `videoSlot`, `avatarSlot`) are projected content in Angular (an input cannot
 * carry a node), so they are typed `unknown`: pass them in the host template,
 * not as values.
 */
export interface ParticipantTileProps {
  /** Participant display name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Video stream slot, projected as `[slot=videoSlot]` content. */
  videoSlot?: unknown
  /** Avatar fallback, projected as `[slot=avatarSlot]` content. */
  avatarSlot?: unknown
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
