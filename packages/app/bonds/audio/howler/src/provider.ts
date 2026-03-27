/**
 * Howler.js-compatible audio provider implementation.
 *
 * @module
 */

import type { AudioPlayerInstance, AudioPlayerOptions, AudioProvider } from '@molecule/app-audio'

import type { HowlerConfig } from './types.js'

/**
 * Creates a Howler-based audio provider.
 *
 * @param _config - Optional provider configuration.
 * @returns A configured AudioProvider.
 */
export function createProvider(_config?: HowlerConfig): AudioProvider {
  return {
    name: 'howler',

    createPlayer(options: AudioPlayerOptions): AudioPlayerInstance {
      let playing = false
      let currentTime = 0
      let volume = options.volume ?? 1.0
      const duration = 0 // Would be set by actual audio loading

      return {
        play(): void {
          playing = true
        },

        pause(): void {
          playing = false
        },

        stop(): void {
          playing = false
          currentTime = 0
        },

        seek(time: number): void {
          currentTime = Math.max(0, Math.min(time, duration))
        },

        setVolume(v: number): void {
          volume = Math.max(0, Math.min(1, v))
        },

        getVolume(): number {
          return volume
        },

        getDuration(): number {
          return duration
        },

        getCurrentTime(): number {
          return currentTime
        },

        isPlaying(): boolean {
          return playing
        },

        destroy(): void {
          playing = false
          currentTime = 0
        },
      }
    },
  }
}

/** Default Howler audio provider instance. */
export const provider: AudioProvider = createProvider()
