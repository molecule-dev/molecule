/**
 * Media streaming provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-media-streaming-hls`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  StreamManifest,
  StreamOptions,
  StreamSegment,
  StreamingProvider,
  TranscodeProfile,
  TranscodeResult,
} from './types.js'

const BOND_TYPE = 'media-streaming'
expectBond(BOND_TYPE)

/**
 * Registers a media streaming provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The media streaming provider implementation to bond.
 */
export const setProvider = (provider: StreamingProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded media streaming provider, throwing if none is configured.
 *
 * @returns The bonded media streaming provider.
 * @throws {Error} If no media streaming provider has been bonded.
 */
export const getProvider = (): StreamingProvider => {
  try {
    return bondRequire<StreamingProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('mediaStreaming.error.noProvider', undefined, {
        defaultValue: 'Media streaming provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a media streaming provider is currently bonded.
 *
 * @returns `true` if a media streaming provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a stream from a media source.
 *
 * @param input - The source media as a Buffer or file path.
 * @param options - Optional streaming configuration.
 * @returns A manifest describing the generated stream.
 * @throws {Error} If no media streaming provider has been bonded.
 */
export const createStream = async (
  input: Buffer | string,
  options?: StreamOptions,
): Promise<StreamManifest> => {
  return getProvider().createStream(input, options)
}

/**
 * Transcodes a media source into multiple quality variants.
 *
 * @param input - The source media as a Buffer or file path.
 * @param profiles - One or more target quality profiles.
 * @returns The aggregated transcode result with variant URIs.
 * @throws {Error} If no media streaming provider has been bonded.
 */
export const transcode = async (
  input: Buffer | string,
  profiles: TranscodeProfile[],
): Promise<TranscodeResult> => {
  return getProvider().transcode(input, profiles)
}

/**
 * Generates a playlist / manifest string from a list of segments.
 *
 * @param segments - Ordered stream segments.
 * @param options - Optional streaming configuration.
 * @returns The manifest content as a string (e.g. M3U8 or MPD).
 * @throws {Error} If no media streaming provider has been bonded.
 */
export const generateManifest = (segments: StreamSegment[], options?: StreamOptions): string => {
  return getProvider().generateManifest(segments, options)
}

/**
 * Retrieves a specific segment of a stream.
 *
 * @param streamId - The stream identifier.
 * @param segmentIndex - Zero-based index of the segment.
 * @returns The raw segment data.
 * @throws {Error} If no media streaming provider has been bonded.
 */
export const getSegment = async (streamId: string, segmentIndex: number): Promise<Buffer> => {
  return getProvider().getSegment(streamId, segmentIndex)
}
