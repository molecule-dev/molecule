/**
 * Types for `@molecule/api-agent-transcript`: one normalized shape for a
 * coding agent's session, whatever harness recorded it.
 *
 * @module
 */

/** Who said a turn. Tool calls and their results are folded into the assistant turn that made them. */
export type AgentTurnRole = 'user' | 'assistant'

/** A file the assistant wrote or edited during a turn. */
export interface AgentFileWrite {
  /** The path as the session recorded it (absolute or relative to the session's working directory). */
  path: string
  /** `create` = the whole file was written; `edit` = part of an existing file was replaced. */
  kind: 'create' | 'edit'
  /**
   * The text the assistant put into the file: the whole file for `create`, the
   * inserted/replacement text for `edit`. Empty when the export omits it.
   */
  text: string
  /** False when the export shows only part of the text (collapsed, truncated or elided). */
  complete: boolean
}

/** One turn of the conversation. Consecutive assistant messages before the next user message form one turn. */
export interface AgentTurn {
  /** Who spoke. */
  role: AgentTurnRole
  /**
   * What was said. For `user`: the message as typed (the harness's injected
   * context is never included). For `assistant`: its prose replies, joined by a
   * blank line — tool calls are not prose; the files they wrote are in `files`.
   */
  text: string
  /** ISO 8601 time of the turn's first message, when the export records it. */
  timestamp?: string
  /** The model that produced an assistant turn, when the export records it. */
  model?: string
  /** Files an assistant turn wrote. Always empty for user turns. */
  files: AgentFileWrite[]
}

/** A whole session, normalized. */
export interface AgentSession {
  /** The reader that produced it, e.g. `claude-code`, `codex`, `molecule-ide`. */
  format: string
  /** The harness's own name for itself, e.g. `Claude Code`. */
  harness: string
  /** The harness version, when the export records it. */
  harnessVersion?: string
  /** The session's model when a single one is named for the whole session. Per-turn models are on each turn. */
  model?: string
  /** ISO 8601 start time, when recorded. */
  startedAt?: string
  /** The turns, in order. */
  turns: AgentTurn[]
}

/** A transcript to read: its text, and its file name when known (some readers use the extension as a hint). */
export interface TranscriptInput {
  /** The file's full text. */
  text: string
  /** The file name or path, e.g. `session.jsonl`, `codex-session.md`. */
  fileName?: string
}

/**
 * The contract every transcript reader bond implements.
 *
 * A reader recognizes its own format with `detect()` and never guesses: it
 * returns false for anything it does not positively recognize, so a composing
 * reader (`@molecule/api-agent-transcript-autodetect`) can try each in turn.
 */
export interface AgentTranscriptReader {
  /** A stable id for the format family, e.g. `claude-code`. */
  readonly format: string
  /** A human label, e.g. `Claude Code`. */
  readonly label: string
  /**
   * Whether this reader recognizes the input.
   *
   * @param input - The transcript.
   * @returns True only when the input is positively this reader's format.
   */
  detect(input: TranscriptInput): boolean
  /**
   * Read the transcript into a normalized session.
   *
   * @param input - The transcript.
   * @returns The session.
   * @throws {Error} When the input is not this reader's format.
   */
  read(input: TranscriptInput): AgentSession
}
