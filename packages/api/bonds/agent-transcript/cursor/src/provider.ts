/**
 * The Cursor transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeCursorExport, readCursorExport } from './export.js'

/**
 * Reads Cursor's "Export Chat" Markdown.
 */
export const provider: AgentTranscriptReader = {
  format: 'cursor',
  label: 'Cursor',
  detect(input: TranscriptInput): boolean {
    return looksLikeCursorExport(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikeCursorExport(input.text)) {
      throw new Error(
        `Not a Cursor transcript${input.fileName ? ` (${input.fileName})` : ''}: expected a Cursor "Export Chat" Markdown file.`,
      )
    }
    return readCursorExport(input.text)
  },
}
