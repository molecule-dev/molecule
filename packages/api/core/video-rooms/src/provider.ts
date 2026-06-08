/**
 * Video rooms provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-video-rooms-daily-co`) call
 * {@link setProvider} during application startup. Application code uses
 * the convenience functions exported from `video-rooms.ts`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { VideoRoomsProvider } from './types.js'

const BOND_TYPE = 'video-rooms'
expectBond(BOND_TYPE)

/**
 * Registers a video rooms provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The video rooms provider implementation to bond.
 */
export const setProvider = (provider: VideoRoomsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded video rooms provider, throwing if none is configured.
 *
 * @returns The bonded video rooms provider.
 * @throws {Error} If no video rooms provider has been bonded.
 */
export const getProvider = (): VideoRoomsProvider => {
  try {
    return bondRequire<VideoRoomsProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('videoRooms.error.noProvider', undefined, {
        defaultValue: 'Video rooms provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a video rooms provider is currently bonded.
 *
 * @returns `true` if a video rooms provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
