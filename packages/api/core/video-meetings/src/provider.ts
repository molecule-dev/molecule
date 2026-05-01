/**
 * Video meetings provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-video-meetings-zoom`) call
 * {@link setProvider} during application startup. Application code uses
 * the convenience functions exported from `video-meetings.ts`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { VideoMeetingsProvider } from './types.js'

const BOND_TYPE = 'video-meetings'
expectBond(BOND_TYPE)

/**
 * Registers a video meetings provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The video meetings provider implementation to bond.
 */
export const setProvider = (provider: VideoMeetingsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded video meetings provider, throwing if none is
 * configured.
 *
 * @returns The bonded video meetings provider.
 * @throws {Error} If no video meetings provider has been bonded.
 */
export const getProvider = (): VideoMeetingsProvider => {
  try {
    return bondRequire<VideoMeetingsProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('videoMeetings.error.noProvider', undefined, {
        defaultValue: 'Video meetings provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a video meetings provider is currently bonded.
 *
 * @returns `true` if a video meetings provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
