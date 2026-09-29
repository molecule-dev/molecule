/**
 * The OpenCode transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeOpencodeExport, readOpencodeExport } from './export.js'

/**
 * Reads what `opencode export` prints.
 */
export const provider: AgentTranscriptReader = {
  format: 'opencode',
  label: 'OpenCode',
  detect(input: TranscriptInput): boolean {
    return looksLikeOpencodeExport(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikeOpencodeExport(input.text)) {
      throw new Error(
        `Not an OpenCode transcript${input.fileName ? ` (${input.fileName})` : ''}: expected the JSON \`opencode export\` prints.`,
      )
    }
    return readOpencodeExport(input.text)
  },
}
