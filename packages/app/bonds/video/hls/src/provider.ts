/**
 * hls.js implementation of the `@molecule/app-video` `VideoProvider`.
 *
 * Reuses the native HTML5 player for the entire control surface (play/pause/
 * seek/volume/fullscreen/pip/tracks/events) and swaps in hls.js only for loading
 * the HLS stream + exposing real adaptive quality levels. See the module
 * `@remarks` in `index.ts`.
 *
 * @module
 */

import Hls from 'hls.js'

import type {
  PlayerConfig,
  QualityLevel,
  VideoPlayer,
  VideoProvider,
  VideoSource,
} from '@molecule/app-video'
import { createNativePlayer } from '@molecule/app-video'

const HLS_MIME_TYPES = new Set(['application/x-mpegurl', 'application/vnd.apple.mpegurl'])

/** True when a source is an HLS stream — by MIME type or a `.m3u8` URL. */
const isHlsSource = (source: VideoSource): boolean =>
  (source.type ? HLS_MIME_TYPES.has(source.type.toLowerCase()) : false) ||
  /\.m3u8(\?|#|$)/i.test(source.src)

/** Whether the browser plays HLS natively (Safari / iOS) — then hls.js is not needed. */
const canPlayNativeHls = (video: HTMLVideoElement): boolean =>
  video.canPlayType('application/vnd.apple.mpegurl') !== ''

/** Maps an hls.js level (by index) to a molecule `QualityLevel`. */
const levelToQuality = (
  level: { height?: number; width?: number; bitrate?: number },
  index: number,
): QualityLevel => ({
  id: index,
  label: level.height ? `${level.height}p` : `Level ${index + 1}`,
  height: level.height || undefined,
  width: level.width || undefined,
  bitrate: level.bitrate ? Math.round(level.bitrate / 1000) : undefined,
})

/** The `Auto` (adaptive-bitrate) entry — `id: -1` maps to hls.js `currentLevel = -1`. */
const AUTO_LEVEL: QualityLevel = { id: -1, label: 'Auto' }

/**
 * Create an hls.js-backed video player. The native HTML5 player owns the
 * `<video>` element and every control; this only feeds the element via hls.js
 * (or native HLS on Safari) and overrides source/quality accessors.
 *
 * @param config - The player configuration (container, sources, controls, etc.).
 * @returns A `VideoPlayer` that plays HLS streams in every browser.
 */
export const createHlsPlayer = (config: PlayerConfig): VideoPlayer => {
  const sources = config.sources ?? []
  const hlsSource = sources.find(isHlsSource)
  const nativeSources = sources.filter((source) => !isHlsSource(source))

  // Native builds the <video> + wires all controls/events. Give it only the
  // non-HLS sources (an MP4 fallback if present); hls.js drives the stream.
  const player = createNativePlayer({ ...config, sources: nativeSources })
  const video = player.getVideoElement()

  let hls: Hls | undefined
  let activeSource: VideoSource | undefined = hlsSource

  const attachHls = (source: VideoSource): void => {
    if (canPlayNativeHls(video)) {
      // Safari / iOS play HLS through the native element — no library needed.
      video.src = source.src
    } else if (Hls.isSupported()) {
      hls = new Hls()
      hls.loadSource(source.src)
      hls.attachMedia(video)
    }
    // else: no HLS support anywhere — the non-HLS <source>s native kept are the fallback.
  }

  const detachHls = (): void => {
    if (hls) {
      hls.destroy()
      hls = undefined
    }
  }

  if (hlsSource) attachHls(hlsSource)

  return {
    ...player,

    load: (newSources, poster) => {
      detachHls()
      const nextHls = newSources.find(isHlsSource)
      const nextNative = newSources.filter((source) => !isHlsSource(source))
      activeSource = nextHls
      player.load(nextNative, poster)
      if (nextHls) attachHls(nextHls)
    },

    getSource: () => activeSource ?? player.getSource(),

    getQualityLevels: () =>
      hls ? [AUTO_LEVEL, ...hls.levels.map(levelToQuality)] : player.getQualityLevels(),

    setQuality: (level) => {
      if (!hls) {
        player.setQuality(level)
        return
      }
      const id = typeof level === 'object' ? level.id : level
      hls.currentLevel = id === 'auto' || id === -1 ? -1 : Number(id)
    },

    getQuality: () => {
      if (!hls) return player.getQuality()
      const current = hls.currentLevel
      if (current < 0) return AUTO_LEVEL
      const level = hls.levels[current]
      return level ? levelToQuality(level, current) : undefined
    },

    destroy: () => {
      detachHls()
      player.destroy()
    },
  }
}

/**
 * Create an hls.js-backed `VideoProvider`.
 *
 * @returns A `VideoProvider` that adds HLS streaming to `@molecule/app-video`.
 */
export const createHlsVideoProvider = (): VideoProvider => ({
  getName: () => 'hls.js',
  isLoaded: () => typeof Hls !== 'undefined',
  getSupportedFormats: () => ['video/mp4', 'video/webm', 'video/ogg', 'application/x-mpegurl'],
  supportsHls: () => true,
  supportsDash: () => false,
  createPlayer: (config) => createHlsPlayer(config),
})

/** The default hls.js video provider, ready to bond with `setProvider(provider)`. */
export const provider: VideoProvider = createHlsVideoProvider()
