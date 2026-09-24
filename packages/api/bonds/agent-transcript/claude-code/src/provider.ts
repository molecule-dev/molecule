/**
 * The Claude Code transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeExportText, readExportText } from './export-text.js'
import { looksLikeSessionJsonl, readSessionJsonl } from './jsonl.js'

/**
 * Reads Claude Code sessions: the session log (`.jsonl`) and the `/export` text.
 */
export const provider: AgentTranscriptReader = {
  format: 'claude-code',
  label: 'Claude Code',
  detect(input: TranscriptInput): boolean {
    return looksLikeSessionJsonl(input.text) || looksLikeExportText(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (looksLikeSessionJsonl(input.text)) return readSessionJsonl(input.text)
    if (looksLikeExportText(input.text)) return readExportText(input.text)
    throw new Error(
      `Not a Claude Code transcript${input.fileName ? ` (${input.fileName})` : ''}: expected a session .jsonl or a /export text.`,
    )
  },
}
