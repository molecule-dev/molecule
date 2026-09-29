/**
 * The GitHub Copilot Chat (VS Code chat export) transcript reader.
 *
 * @module
 */

import type {
  AgentSession,
  AgentTranscriptReader,
  TranscriptInput,
} from '@molecule/api-agent-transcript'

import { looksLikeChatExport, readChatExport } from './export.js'

/**
 * Reads the JSON VS Code's "Chat: Export Chat…" saves.
 */
export const provider: AgentTranscriptReader = {
  format: 'copilot-chat',
  label: 'GitHub Copilot Chat',
  detect(input: TranscriptInput): boolean {
    return looksLikeChatExport(input.text)
  },
  read(input: TranscriptInput): AgentSession {
    if (!looksLikeChatExport(input.text)) {
      throw new Error(
        `Not a GitHub Copilot Chat transcript${input.fileName ? ` (${input.fileName})` : ''}: expected the chat.json VS Code's "Export Chat…" saves.`,
      )
    }
    return readChatExport(input.text)
  },
}
