/**
 * The Codex CLI transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeMarkdownExport, readMarkdownExport } from './markdown-export.js'
import { looksLikeRollout, readRollout } from './rollout.js'

/**
 * Reads Codex CLI sessions: the rollout log (`.jsonl`) and the Markdown export.
 */
export const provider: AgentTranscriptReader = {
  format: 'codex',
  label: 'Codex CLI',
  detect(input: TranscriptInput): boolean {
    return looksLikeRollout(input.text) || looksLikeMarkdownExport(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (looksLikeRollout(input.text)) return readRollout(input.text)
    if (looksLikeMarkdownExport(input.text)) return readMarkdownExport(input.text)
    throw new Error(
      `Not a Codex CLI transcript${input.fileName ? ` (${input.fileName})` : ''}: expected a rollout .jsonl or a Markdown export.`,
    )
  },
}
