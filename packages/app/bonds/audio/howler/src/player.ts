/**
 * Howler-backed audio player instance.
 *
 * Wraps a live `Howl` in the molecule `AudioPlayerInstance` interface. Every
 * method delegates to the corresponding real Howler call, so `getDuration()`,
 * `getCurrentTime()`, `isPlaying()`, and `getVolume()` reflect actual Howler
 * state instead of local bookkeeping.
 *
 * @module
 */

import { Howl } from 'howler'

import type { AudioPlayerInstance, AudioPlayerOptions } from '@molecule/app-audio'

import type { HowlerConfig } from './types.js'

/** A frame-scheduler handle: a `requestAnimationFrame` id or a `setTimeout` timer. */
type FrameHandle = number | ReturnType<typeof setTimeout>

/**
 * Schedules a callback on the next animation frame, falling back to a ~60fps
 * timer when `requestAnimationFrame` is unavailable (e.g. non-DOM runtimes).
 *
 * @param callback - Invoked on the next frame.
 * @returns A handle that can be passed to {@link cancelFrame}.
 */
const requestFrame = (callback: () => void): FrameHandle => {
  const raf = globalThis.requestAnimationFrame
  if (typeof raf === 'function') {
    return raf(callback)
  }
  return setTimeout(callback, 1000 / 60)
}

/**
 * Cancels a frame scheduled by {@link requestFrame}.
 *
 * A numeric handle came from `requestAnimationFrame`; anything else came from
 * the `setTimeout` fallback.
 *
 * @param handle - The handle returned by {@link requestFrame}.
 */
const cancelFrame = (handle: FrameHandle): void => {
  if (typeof handle === 'number') {
    globalThis.cancelAnimationFrame?.(handle)
    return
  }
  clearTimeout(handle)
}

/** Clamps a volume level into Howler's valid 0.0–1.0 range. */
const clampVolume = (volume: number): number => Math.max(0, Math.min(1, volume))

/**
 * Creates a real, audible audio player backed by a Howler `Howl` instance.
 *
 * The core `AudioPlayerOptions` are mapped onto Howler's constructor options
 * (`src` normalized to an array, plus `loop`/`autoplay`/`volume`), and the
 * provider-level {@link HowlerConfig} supplies the default `html5` backend.
 * Event subscriptions are wired through Howler's `.on(...)` API: `onEnd` fires
 * from the `end` event, and `onProgress` is driven by a `requestAnimationFrame`
 * loop that runs while the sound is playing (plus one emit on `load`, so the
 * real duration is reported as soon as metadata is available).
 *
 * @param options - Core audio player configuration (source, callbacks, etc.).
 * @param config - Provider-level Howler configuration.
 * @returns An `AudioPlayerInstance` whose reads reflect live Howler state.
 */
export const createHowlerPlayer = (
  options: AudioPlayerOptions,
  config: HowlerConfig = {},
): AudioPlayerInstance => {
  const sources = Array.isArray(options.src) ? options.src : [options.src]

  const howl = new Howl({
    src: sources,
    autoplay: options.autoplay ?? false,
    loop: options.loop ?? false,
    volume: clampVolume(options.volume ?? 1.0),
    html5: config.html5 ?? false,
  })

  let frameHandle: FrameHandle | null = null

  // Howler's `seek()` getter normally returns the position in seconds, but it
  // yields the `Howl` itself if called before the sound has loaded — guard so
  // callers always get a real number.
  const readCurrentTime = (): number => {
    const position = howl.seek()
    return typeof position === 'number' ? position : 0
  }

  const emitProgress = (): void => {
    options.onProgress?.(readCurrentTime(), howl.duration())
  }

  const stopProgress = (): void => {
    if (frameHandle !== null) {
      cancelFrame(frameHandle)
      frameHandle = null
    }
  }

  const tick = (): void => {
    emitProgress()
    frameHandle = howl.playing() ? requestFrame(tick) : null
  }

  const startProgress = (): void => {
    if (!options.onProgress || frameHandle !== null) {
      return
    }
    frameHandle = requestFrame(tick)
  }

  // Real Howler event wiring via `.on(...)` — playback drives progress
  // reporting, and the `end` event forwards to the caller's `onEnd`.
  howl.on('play', startProgress)
  howl.on('pause', stopProgress)
  howl.on('stop', stopProgress)
  howl.on('end', () => {
    stopProgress()
    options.onEnd?.()
  })
  howl.on('load', emitProgress)

  return {
    play: (): void => {
      howl.play()
    },

    pause: (): void => {
      howl.pause()
    },

    stop: (): void => {
      howl.stop()
    },

    seek: (time: number): void => {
      howl.seek(Math.max(0, time))
    },

    setVolume: (volume: number): void => {
      howl.volume(clampVolume(volume))
    },

    getVolume: (): number => howl.volume(),

    getDuration: (): number => howl.duration(),

    getCurrentTime: (): number => readCurrentTime(),

    isPlaying: (): boolean => howl.playing(),

    destroy: (): void => {
      stopProgress()
      howl.off()
      howl.unload()
    },
  }
}
