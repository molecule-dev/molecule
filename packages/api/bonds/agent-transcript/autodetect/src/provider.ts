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
import { provider as aider } from '@molecule/api-agent-transcript-aider'
import { provider as claudeCode } from '@molecule/api-agent-transcript-claude-code'
import { provider as cline } from '@molecule/api-agent-transcript-cline'
import { provider as codex } from '@molecule/api-agent-transcript-codex'
import { provider as copilotChat } from '@molecule/api-agent-transcript-copilot-chat'
import { provider as cursor } from '@molecule/api-agent-transcript-cursor'
import { provider as geminiCli } from '@molecule/api-agent-transcript-gemini-cli'
import { provider as markdownChat } from '@molecule/api-agent-transcript-markdown-chat'
import { provider as moleculeIde } from '@molecule/api-agent-transcript-molecule-ide'
import { provider as opencode } from '@molecule/api-agent-transcript-opencode'

// Pi is an OPTIONAL peer, not a dependency: the bond is not yet published to
// the public registry, and a hard dependency on an unresolvable name made
// every registry install of this package fail outright (E404 resolving the
// install graph — autodetect 1.2.0 was uninstallable from npm for exactly
// this reason). Resolve it dynamically and join it to the reader list only
// when the consuming project actually ships it.
const pi: AgentTranscriptReader | undefined = await import(
  '@molecule/api-agent-transcript-pi'
).then(
  (m) => m.provider,
  () => undefined,
)

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
 * Every harness-specific reader, in the order they are tried. Each accepts
 * only its own harness's files, so the order only matters for the generic
 * Markdown chat reader, which is not in this list. Compose
 * `createReader(harnessReaders)` when only a real harness's own file should
 * be read.
 */
export const harnessReaders: readonly AgentTranscriptReader[] = [
  claudeCode,
  codex,
  moleculeIde,
  geminiCli,
  cline,
  opencode,
  ...(pi ? [pi] : []),
  copilotChat,
  cursor,
  aider,
]

/**
 * Reads a transcript from any supported harness — Claude Code, Codex CLI,
 * the Molecule IDE, Gemini CLI, Cline / Roo Code, OpenCode, Pi, GitHub Copilot
 * Chat, Cursor and Aider — and, last, any plain Markdown / text chat with
 * User / Assistant speaker markers.
 */
export const provider: AgentTranscriptReader = createReader([...harnessReaders, markdownChat])
