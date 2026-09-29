/**
 * The Cline / Roo Code transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeUiMessages, readUiMessages } from './ui-messages.js'

/**
 * Reads a Cline or Roo Code task's `ui_messages.json`.
 */
export const provider: AgentTranscriptReader = {
  format: 'cline',
  label: 'Cline / Roo Code',
  detect(input: TranscriptInput): boolean {
    return looksLikeUiMessages(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikeUiMessages(input.text)) {
      throw new Error(
        `Not a Cline / Roo Code transcript${input.fileName ? ` (${input.fileName})` : ''}: expected a task's ui_messages.json.`,
      )
    }
    return readUiMessages(input.text)
  },
}
