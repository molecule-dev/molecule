/**
 * Transcript reader bond accessor and convenience functions.
 *
 * A reader bond (e.g. `@molecule/api-agent-transcript-autodetect`) is bonded
 * once at startup with `setProvider()`; application code then calls
 * `readTranscript()` / `canReadTranscript()`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { AgentSession, AgentTranscriptReader, TranscriptInput } from './types.js'

const BOND_TYPE = 'agent-transcript'
expectBond(BOND_TYPE)

/**
 * Registers a transcript reader as the active one. Called during application startup.
 *
 * @param provider - The reader to bond.
 */
export const setProvider = (provider: AgentTranscriptReader): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded transcript reader, throwing if none is configured.
 *
 * @returns The bonded reader.
 * @throws {Error} If no reader has been bonded.
 */
export const getProvider = (): AgentTranscriptReader => {
  try {
    return bondRequire<AgentTranscriptReader>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('agentTranscript.error.noProvider', undefined, {
        defaultValue: 'Agent transcript reader not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a transcript reader is bonded.
 *
 * @returns `true` if a reader is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Whether the bonded reader recognizes a transcript.
 *
 * @param input - The transcript text and, when known, its file name.
 * @returns True when the bonded reader can read it.
 * @throws {Error} If no reader has been bonded.
 */
export const canReadTranscript = (input: TranscriptInput): boolean => {
  return getProvider().detect(input)
}

/**
 * Read a transcript into a normalized session with the bonded reader.
 *
 * @param input - The transcript text and, when known, its file name.
 * @returns The normalized session.
 * @throws {Error} If no reader has been bonded, or the bonded reader does not recognize the input.
 */
export const readTranscript = (input: TranscriptInput): AgentSession => {
  return getProvider().read(input)
}
