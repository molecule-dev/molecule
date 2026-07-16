/**
 * Video-call participant tile + controls bar.
 *
 * Exports:
 * - `<VideoCallControls>` — bottom controls bar (mute/video/screen-share/leave).
 * - `<ParticipantTile>` — single participant card with name, mute, hand-raised, speaking ring.
 *
 * Pure UI — the app owns the WebRTC/SDK plumbing (pair with an
 * `@molecule/api-video-rooms-*` bond server-side) and passes state +
 * callbacks down.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ParticipantTile, VideoCallControls } from '@molecule/app-video-call-controls-react'
 *
 * function CallBar() {
 *   const [audioOn, setAudioOn] = useState(true)
 *   const [videoOn, setVideoOn] = useState(true)
 *   return (
 *     <div>
 *       <ParticipantTile name="Alice" audioEnabled={audioOn} speaking />
 *       <VideoCallControls
 *         audioEnabled={audioOn}
 *         onToggleAudio={() => setAudioOn((v) => !v)}
 *         videoEnabled={videoOn}
 *         onToggleVideo={() => setVideoOn((v) => !v)}
 *         onLeave={() => console.log('leave call')}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * Control-button glyphs are EMOJI delivered as i18n defaultValues
 * (`t('call.muteOn')` → 🎙 etc.) with no separate aria-labels — the emoji
 * doubles as the accessible name. Translations live in
 * `@molecule/app-locales-video-call-controls` (on disk, not yet registered
 * in mlcl's registry — register it or supply the `call.*` keys in app
 * translations). In `<ParticipantTile>` the ' (you)' suffix and the
 * 'Muted' / 'Hand raised' indicator labels are hardcoded English. Tiles
 * are fixed 16:9 dark surfaces (#111, white text, green speaking ring)
 * regardless of theme; supply your `<video>` element via `videoSlot` and a
 * fallback via `avatarSlot`. The screen-share button renders only when
 * `onToggleScreenShare` is provided; `extraControls` slots more buttons
 * before Leave. Props (documented on the exported `VideoCallControlsProps`
 * and `ParticipantTileProps` interfaces) — VideoCallControls:
 * audioEnabled, onToggleAudio, videoEnabled, onToggleVideo, screenSharing,
 * onToggleScreenShare, onLeave, extraControls, className; ParticipantTile:
 * name, videoSlot, avatarSlot, audioEnabled, handRaised, speaking, isLocal,
 * className.
 *
 * @module
 */

export * from './ParticipantTile.js'
export * from './VideoCallControls.js'
