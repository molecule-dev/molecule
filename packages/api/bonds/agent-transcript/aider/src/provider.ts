/**
 * The Aider transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeAiderHistory, readAiderHistory } from './history.js'

/**
 * Reads Aider's `.aider.chat.history.md`.
 */
export const provider: AgentTranscriptReader = {
  format: 'aider',
  label: 'Aider',
  detect(input: TranscriptInput): boolean {
    return looksLikeAiderHistory(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikeAiderHistory(input.text)) {
      throw new Error(
        `Not an Aider transcript${input.fileName ? ` (${input.fileName})` : ''}: expected a .aider.chat.history.md file.`,
      )
    }
    return readAiderHistory(input.text)
  },
}
