/**
 * Video-call participant tile + controls bar.
 *
 * Exports:
 * - `<VideoCallControls>` — bottom controls bar (mute/video/screen-share/leave).
 * - `<ParticipantTile>` — single participant card with name, mute, hand-raised, speaking ring.
 *
 * @example
 * ```tsx
 * import { ParticipantTile, VideoCallControls } from '@molecule/app-video-call-controls-react'
 *
 * <ParticipantTile
 *   name="Alice"
 *   videoSlot={<video ref={videoRef} autoPlay />}
 *   audioEnabled={audioOn}
 *   speaking={isSpeaking}
 * />
 *
 * <VideoCallControls
 *   audioEnabled={audioOn}
 *   onToggleAudio={() => setAudioOn(v => !v)}
 *   videoEnabled={videoOn}
 *   onToggleVideo={() => setVideoOn(v => !v)}
 *   onLeave={handleLeave}
 * />
 * ```
 * @module
 */

export * from './ParticipantTile.js'
export * from './VideoCallControls.js'
