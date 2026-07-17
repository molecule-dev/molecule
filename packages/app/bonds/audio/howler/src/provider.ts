/**
 * Howler.js audio provider implementation.
 *
 * @module
 */

import { Howler } from 'howler'

import type { AudioPlayerInstance, AudioPlayerOptions, AudioProvider } from '@molecule/app-audio'

import { createHowlerPlayer } from './player.js'
import type { HowlerConfig } from './types.js'

/**
 * Creates a Howler-backed audio provider that plays real, audible audio.
 *
 * `config.volume`, when provided, sets Howler's global volume for every sound;
 * `config.html5` selects the HTML5 Audio backend (over Web Audio) as the
 * default for the players this provider creates. Each `createPlayer()` builds a
 * live `Howl` and returns an `AudioPlayerInstance` whose reads reflect real
 * Howler state (see {@link createHowlerPlayer}).
 *
 * @param config - Optional provider configuration.
 * @returns A configured `AudioProvider` backed by Howler.
 */
export const createProvider = (config: HowlerConfig = {}): AudioProvider => {
  if (typeof config.volume === 'number') {
    Howler.volume(config.volume)
  }

  return {
    name: 'howler',

    createPlayer(options: AudioPlayerOptions): AudioPlayerInstance {
      return createHowlerPlayer(options, config)
    },
  }
}

/** Default Howler audio provider instance. */
export const provider: AudioProvider = createProvider()
