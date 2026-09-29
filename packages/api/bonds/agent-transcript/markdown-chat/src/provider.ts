/**
 * The generic Markdown / plain-text chat reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeMarkdownChat, readMarkdownChat } from './chat.js'

/**
 * Reads a plain Markdown or text chat with User / Assistant speaker markers.
 * Compose it LAST: every harness-specific reader should get the first look.
 */
export const provider: AgentTranscriptReader = {
  format: 'markdown-chat',
  label: 'Markdown chat',
  detect(input: TranscriptInput): boolean {
    return looksLikeMarkdownChat(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikeMarkdownChat(input.text)) {
      throw new Error(
        `Not a Markdown chat${input.fileName ? ` (${input.fileName})` : ''}: expected User and Assistant speaker markers (\`## User\`, \`**User:**\` or \`User:\`).`,
      )
    }
    return readMarkdownChat(input.text)
  },
}
