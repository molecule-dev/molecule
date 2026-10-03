/**
 * The Pi transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikePiSession, readPiSession } from './session.js'

/**
 * Reads Pi session files and `pi --mode json` output.
 */
export const provider: AgentTranscriptReader = {
  format: 'pi',
  label: 'Pi',
  detect(input: TranscriptInput): boolean {
    return looksLikePiSession(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikePiSession(input.text)) {
      throw new Error(
        `Not a Pi transcript${input.fileName ? ` (${input.fileName})` : ''}: expected a Pi session .jsonl whose first line is {"type":"session",…}.`,
      )
    }
    return readPiSession(input.text)
  },
}
