/**
 * The Gemini CLI transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeGeminiSession, readGeminiSession } from './session.js'

/**
 * Reads Gemini CLI sessions: the session log, the older session file and
 * `/chat save` checkpoints.
 */
export const provider: AgentTranscriptReader = {
  format: 'gemini-cli',
  label: 'Gemini CLI',
  detect(input: TranscriptInput): boolean {
    return looksLikeGeminiSession(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikeGeminiSession(input.text)) {
      throw new Error(
        `Not a Gemini CLI transcript${input.fileName ? ` (${input.fileName})` : ''}: expected a session .jsonl/.json or a /chat save checkpoint.`,
      )
    }
    return readGeminiSession(input.text)
  },
}
