/**
 * The Molecule IDE transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeConversation, readConversation } from './conversation.js'

/**
 * Reads a Molecule IDE conversation (its stored JSON).
 */
export const provider: AgentTranscriptReader = {
  format: 'molecule-ide',
  label: 'Molecule IDE',
  detect(input: TranscriptInput): boolean {
    return looksLikeConversation(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    return readConversation(input.text)
  },
}
