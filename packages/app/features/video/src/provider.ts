/**
 * Video provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createNativeVideoProvider } from './player.js'
import type { PlayerConfig, VideoPlayer, VideoProvider } from './types.js'

const BOND_TYPE = 'video'

/**
 * Set the video provider.
 * @param provider - VideoProvider implementation to register.
 */
export const setProvider = (provider: VideoProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current video provider. Falls back to a native HTML5 video
 * provider if none has been explicitly set.
 * @returns The active VideoProvider instance.
 */
export const getProvider = (): VideoProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createNativeVideoProvider())
  }
  return bondGet<VideoProvider>(BOND_TYPE)!
}

/**
 * Check if a video provider has been registered.
 * @returns Whether a VideoProvider has been bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Create a new video player instance using the current provider.
 * @param config - Player configuration (container, source, autoplay, controls, etc.).
 * @returns A VideoPlayer instance for controlling playback.
 */
export const createPlayer = (config: PlayerConfig): VideoPlayer | Promise<VideoPlayer> => {
  return getProvider().createPlayer(config)
}
