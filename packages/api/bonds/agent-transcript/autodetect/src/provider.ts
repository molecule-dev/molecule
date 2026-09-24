/**
 * A transcript reader that recognizes the format and delegates to the reader for it.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'
import { provider as claudeCode } from '@molecule/api-agent-transcript-claude-code'
import { provider as codex } from '@molecule/api-agent-transcript-codex'
import { provider as moleculeIde } from '@molecule/api-agent-transcript-molecule-ide'

/**
 * Compose readers: the first whose `detect()` accepts the input reads it.
 *
 * @param readers - The readers to try, in order.
 * @returns One reader over all of them.
 */
export function createReader(readers: readonly AgentTranscriptReader[]): AgentTranscriptReader {
  const pick = (input: TranscriptInput): AgentTranscriptReader | undefined =>
    readers.find((r) => r.detect(input))
  return {
    format: 'autodetect',
    label: readers.map((r) => r.label).join(', '),
    detect(input: TranscriptInput): boolean {
      return pick(input) !== undefined
    },
    read(input: TranscriptInput): AgentSession {
      const reader = pick(input)
      if (!reader) {
        throw new Error(
          `No transcript reader recognizes ${input.fileName ?? 'this file'}. Readers tried: ${readers.map((r) => r.label).join(', ')}.`,
        )
      }
      return reader.read(input)
    },
  }
}

/**
 * Reads any Claude Code, Codex CLI or Molecule IDE transcript.
 */
export const provider: AgentTranscriptReader = createReader([claudeCode, codex, moleculeIde])
