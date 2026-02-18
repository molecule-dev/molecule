/**
 * Native video player implementation for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { PlayerConfig, PlayerEvent, VideoPlayer, VideoProvider } from './types.js'

/**
 * Create a native HTML5 video player instance. Uses the browser's `<video>` element
 * with standard playback controls, source management, and event handling.
 * @param config - Player configuration (container, source, autoplay, controls, etc.).
 * @returns A VideoPlayer instance for controlling the HTML5 video element.
 */
export const createNativePlayer = (config: PlayerConfig): VideoPlayer => {
  const container =
    typeof config.container === 'string'
      ? document.getElementById(config.container)!
      : config.container

  // Create video element
  const video = document.createElement('video')
  video.style.width = '100%'
  video.style.height = '100%'
  video.style.backgroundColor = '#000'

  if (config.poster) video.poster = config.poster
  if (config.autoplay) video.autoplay = true
  if (config.loop) video.loop = true
  if (config.muted) video.muted = true
  if (config.volume !== undefined) video.volume = config.volume
  if (config.preload) video.preload = config.preload
  if (config.playsinline) video.playsInline = true
  if (config.crossorigin) video.crossOrigin = config.crossorigin
  if (config.controls !== false) video.controls = true
  if (config.className) video.className = config.className

  // Add sources
  for (const source of config.sources) {
    const sourceEl = document.createElement('source')
    sourceEl.src = source.src
    if (source.type) sourceEl.type = source.type
    video.appendChild(sourceEl)
  }

  // Add text tracks
  if (config.tracks) {
    for (const track of config.tracks) {
      const trackEl = document.createElement('track')
      trackEl.kind = track.kind
      trackEl.label = track.label
      trackEl.srclang = track.language
      trackEl.src = track.src
      if (track.default) trackEl.default = true
      video.appendChild(trackEl)
    }
  }

  container.appendChild(video)

  const eventHandlers = new Map<PlayerEvent, Set<(data: unknown) => void>>()

  const emit = (event: PlayerEvent, data: unknown = null): void => {
    eventHandlers.get(event)?.forEach((handler) => handler(data))
  }

  // Map native events to player events
  const eventMap: [string, PlayerEvent][] = [
    ['play', 'play'],
    ['pause', 'pause'],
    ['ended', 'ended'],
    ['timeupdate', 'timeupdate'],
    ['progress', 'progress'],
    ['seeking', 'seeking'],
    ['seeked', 'seeked'],
    ['volumechange', 'volumechange'],
    ['ratechange', 'ratechange'],
    ['waiting', 'waiting'],
    ['canplay', 'canplay'],
    ['canplaythrough', 'canplaythrough'],
    ['loadedmetadata', 'loadedmetadata'],
    ['loadeddata', 'loadeddata'],
    ['durationchange', 'durationchange'],
    ['error', 'error'],
  ]

  for (const [nativeEvent, playerEvent] of eventMap) {
    video.addEventListener(nativeEvent, () => emit(playerEvent))
  }

  let currentSourceIndex = 0

  return {
    play: () => video.play(),
    pause: () => video.pause(),
    togglePlay: () => (video.paused ? video.play() : video.pause()),
    stop: () => {
      video.pause()
      video.currentTime = 0
    },
    seek: (time) => {
      video.currentTime = time
    },
    seekForward: (seconds = 10) => {
      video.currentTime = Math.min(video.currentTime + seconds, video.duration)
    },
    seekBackward: (seconds = 10) => {
      video.currentTime = Math.max(video.currentTime - seconds, 0)
    },
    getCurrentTime: () => video.currentTime,
    getDuration: () => video.duration,
    getBuffered: () => {
      const ranges: { start: number; end: number }[] = []
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        })
      }
      return ranges
    },
    setVolume: (volume) => {
      video.volume = Math.max(0, Math.min(1, volume))
    },
    getVolume: () => video.volume,
    mute: () => {
      video.muted = true
    },
    unmute: () => {
      video.muted = false
    },
    toggleMute: () => {
      video.muted = !video.muted
    },
    isMuted: () => video.muted,
    setPlaybackRate: (rate) => {
      video.playbackRate = rate
    },
    getPlaybackRate: () => video.playbackRate,
    getQualityLevels: () =>
      config.sources.map((s, i) => ({
        id: i,
        label:
          s.label ||
          s.resolution ||
          t('video.source.label', { number: i + 1 }, { defaultValue: 'Source {{number}}' }),
        bitrate: s.bitrate,
      })),
    setQuality: (level) => {
      const index =
        typeof level === 'number' ? level : config.sources.findIndex((s) => s.label === level)
      if (index >= 0 && index < config.sources.length) {
        const currentTime = video.currentTime
        const wasPlaying = !video.paused
        video.src = config.sources[index].src
        video.currentTime = currentTime
        currentSourceIndex = index
        if (wasPlaying) video.play()
        emit('qualitychange', { quality: config.sources[index] })
      }
    },
    getQuality: () =>
      config.sources[currentSourceIndex]
        ? {
            id: currentSourceIndex,
            label:
              config.sources[currentSourceIndex].label ||
              t(
                'video.source.label',
                { number: currentSourceIndex + 1 },
                { defaultValue: 'Source {{number}}' },
              ),
          }
        : undefined,
    enterFullscreen: async () => {
      await container.requestFullscreen()
    },
    exitFullscreen: async () => {
      await document.exitFullscreen()
    },
    toggleFullscreen: async () => {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
    },
    isFullscreen: () => document.fullscreenElement === container,
    enterPip: async () => {
      await video.requestPictureInPicture()
    },
    exitPip: async () => {
      await document.exitPictureInPicture()
    },
    togglePip: async () => {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    },
    isPip: () => document.pictureInPictureElement === video,
    load: (sources, poster) => {
      video.innerHTML = ''
      for (const source of sources) {
        const sourceEl = document.createElement('source')
        sourceEl.src = source.src
        if (source.type) sourceEl.type = source.type
        video.appendChild(sourceEl)
      }
      if (poster) video.poster = poster
      video.load()
    },
    getSource: () => config.sources[currentSourceIndex],
    getState: () => ({
      currentTime: video.currentTime,
      duration: video.duration,
      buffered: Array.from({ length: video.buffered.length }, (_, i) => ({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      })),
      playing: !video.paused && !video.ended,
      paused: video.paused,
      ended: video.ended,
      seeking: video.seeking,
      waiting: video.readyState < 3,
      muted: video.muted,
      volume: video.volume,
      playbackRate: video.playbackRate,
      fullscreen: document.fullscreenElement === container,
      pip: document.pictureInPictureElement === video,
    }),
    on: (event, handler) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
      return () => eventHandlers.get(event)?.delete(handler)
    },
    off: (event, handler) => {
      eventHandlers.get(event)?.delete(handler)
    },
    getTextTracks: () => config.tracks || [],
    setTextTrack: (language) => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = video.textTracks[i].language === language ? 'showing' : 'hidden'
      }
    },
    getActiveTextTrack: () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        if (video.textTracks[i].mode === 'showing') {
          return config.tracks?.[i]
        }
      }
      return undefined
    },
    showControls: () => {
      video.controls = true
    },
    hideControls: () => {
      video.controls = false
    },
    getVideoElement: () => video,
    getContainer: () => container,
    getInstance: () => video,
    screenshot: () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)
      return canvas.toDataURL('image/png')
    },
    destroy: () => {
      video.pause()
      video.src = ''
      video.load()
      video.remove()
      eventHandlers.clear()
    },
  }
}

/**
 * Create a native HTML5 video provider. Supports standard formats (MP4, WebM, Ogg)
 * using the browser's built-in `<video>` element. Does not support HLS or DASH streaming.
 * @returns A VideoProvider backed by native HTML5 video.
 */
export const createNativeVideoProvider = (): VideoProvider => {
  return {
    getName: () => 'native',
    isLoaded: () => true,
    getSupportedFormats: () => ['video/mp4', 'video/webm', 'video/ogg'],
    supportsHls: () => false,
    supportsDash: () => false,
    createPlayer: (config) => createNativePlayer(config),
  }
}
