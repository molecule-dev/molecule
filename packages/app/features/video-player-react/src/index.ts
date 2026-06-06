/**
 * HTML5 video player chrome.
 *
 * Exports `<VideoPlayer>` — play/pause/scrub/volume/fullscreen with optional captions.
 *
 * @example
 * ```tsx
 * import { VideoPlayer } from '@molecule/app-video-player-react'
 *
 * <VideoPlayer
 *   src="https://cdn.example.com/intro.mp4"
 *   poster="https://cdn.example.com/intro-thumb.jpg"
 *   captionsSrc="https://cdn.example.com/intro.vtt"
 *   onEnded={() => markWatched(videoId)}
 * />
 * ```
 * @module
 */

export * from './VideoPlayer.js'
