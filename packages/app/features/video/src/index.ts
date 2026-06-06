/**
 * Video player interface for molecule.dev.
 *
 * Provides a unified API for video playback that works with
 * different video player libraries (Video.js, Plyr, Vidstack, etc.).
 *
 * @example
 * ```tsx
 * import { createPlayer, setProvider, createNativeVideoProvider } from '@molecule/app-video'
 *
 * // Wire the provider once at startup (defaults to native HTML5 if skipped)
 * setProvider(createNativeVideoProvider())
 *
 * // Create a player imperatively against a DOM container
 * const player = await createPlayer({
 *   container: '#video-root',
 *   sources: [{ src: 'https://example.com/video.mp4', type: 'video/mp4', label: '1080p' }],
 *   poster: 'https://example.com/poster.jpg',
 *   autoplay: false,
 *   controls: true,
 *   fluid: true,
 * })
 *
 * player.on('ended', () => console.log('Playback finished'))
 * ```
 *
 * @module
 */

export * from './player.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
