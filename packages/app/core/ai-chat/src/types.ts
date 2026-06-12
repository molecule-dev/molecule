/**
 * Type definitions for the AI chat core interface.
 *
 * @module
 */

/**
 * An ordered block within an assistant message, preserving the interleaved
 * sequence of text chunks and tool calls as they were received from the stream.
 */
export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; id: string }
  | { type: 'thinking'; content: string }
  | {
      type: 'verification'
      status: 'ok' | 'error'
      output?: string
      workspaces: string[]
      categories?: string[]
    }
  | { type: 'resource_limit'; resource: string; message: string }

/**
 * A file attachment sent with a chat message.
 */
export interface ChatAttachment {
  /** MIME type (e.g., 'image/jpeg', 'application/pdf'). */
  mediaType: string
  /** Base64-encoded file data (no data-URL prefix). */
  data: string
  /** Original filename for display. */
  filename: string
  /** File size in bytes (for validation and display). */
  size: number
}

/**
 * Attachment metadata stored in message history (no base64 data).
 */
export interface AttachmentMeta {
  /** Original filename. */
  filename: string
  /** MIME type. */
  mediaType: string
  /** File size in bytes. */
  size: number
}

/**
 * A single message in a chat conversation, including role, content,
 * and optional tool-call metadata.
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** Ordered sequence of text and tool-call blocks, preserving interleaved order. */
  blocks?: MessageBlock[]
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  /** Set when the user aborted the response mid-stream. */
  aborted?: boolean
  /** Set on user messages that are queued waiting for the current stream to finish. */
  queued?: boolean
  /** Set when the agentic loop hit its iteration limit before finishing. */
  loopLimitReached?: number
  /** Persisted commit record for display in conversation history. */
  commitRecord?: { message: string; files: string[]; hash?: string }
  commitSuggestion?: CommitSuggestion
  /** File attachments sent with this message (metadata only — no base64 data in history). */
  attachments?: AttachmentMeta[]
}

/**
 * A suggested git commit after file changes, shown to the user for one-click committing.
 */
export interface CommitSuggestion {
  files: string[]
  message?: string
  status: 'pending' | 'committing' | 'committed' | 'error'
}

/**
 * A tool invocation within an assistant message, tracking its lifecycle
 * from pending through completion or error.
 */
export interface ToolCall {
  id: string
  name: string
  input: unknown
  output?: unknown
  status: 'pending' | 'running' | 'done' | 'error'
  /**
   * Characters of this tool's input streamed so far via `tool_input_delta`,
   * before the complete `input` arrives. Drives the live token estimate while a
   * large input is still generating. Transient — not persisted; `input` is the
   * source of truth once the call completes.
   */
  streamInputChars?: number
  /** Snapshot of original/modified file content captured at tool-call time (not sent to AI). */
  fileDiff?: { original: string; modified: string }
  /** Whether this tool call's file change has been undone. */
  isUndone?: boolean
}

/**
 * Configuration for a chat session, including the API endpoint,
 * project context, and optional model/prompt overrides.
 */
export interface ChatConfig {
  /** API endpoint for sending messages. */
  endpoint: string
  /** Project ID for context. */
  projectId?: string
  /** System prompt override. */
  systemPrompt?: string
  /** AI model to use. */
  model?: string
  /** When true, resume the last interrupted assistant response without adding a user message. */
  resume?: boolean
}

/**
 * Reactive state for a chat session, including messages, loading state,
 * error state, and WebSocket connection status.
 */
export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}

/**
 * Callback invoked for each event in a streaming chat response.
 */
export type ChatEventHandler = (event: ChatStreamEvent) => void

/**
 * Discriminated union of events emitted during a streaming chat response.
 * Events include text chunks, tool invocations, tool results, completion,
 * and errors.
 */
export type ChatStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  // The model has BEGUN a tool call (id + name known) but its input is still
  // streaming — lets the UI show activity ("Writing the plan") immediately.
  | { type: 'tool_use_start'; id: string; name: string }
  // Progress for the in-flight tool call's input — `chars` is the number of
  // input characters since the last delta (coalesced server-side). Drives the
  // live token counter while a large input (file / plan) is being generated.
  // `partialInput` carries short display fields (e.g. file `path`, plan `name`)
  // extracted server-side from the partial args as soon as they're known, so the
  // tool card can label itself ("Write `app.ts`") before the full input arrives.
  | {
      type: 'tool_input_delta'
      id: string
      chars: number
      partialInput?: Record<string, string>
    }
  | { type: 'tool_result'; id: string; output: unknown }
  | { type: 'file_diff'; path: string; oldContent: string | null; newContent: string }
  | { type: 'commit_suggestion'; files: string[] }
  | { type: 'conversation'; id: string }
  | { type: 'mode'; mode: 'plan' | 'execute' }
  | { type: 'loop_limit_reached'; maxLoops: number }
  | { type: 'compaction'; compactedCount: number; remainingCount: number; summary: string }
  | {
      type: 'verification_result'
      status: 'ok' | 'error'
      output?: string
      workspaces: string[]
      categories?: ('type' | 'lint' | 'runtime')[]
      changedPaths?: string[]
    }
  | {
      type: 'preview_error'
      errors: Array<{ message: string; source?: string; line?: number; column?: number }>
    }
  | { type: 'resource_limit'; resource: 'memory'; message: string }
  | { type: 'upgrade_prompt'; feature: string; message: string }
  // Generic extension point for app-specific stream events the SHARED package knows
  // nothing about. A consuming app emits `{ type: 'custom', name, data }` and (for
  // the react IDE) registers a renderer via `registerCustomEventCard(name, …)` from
  // `@molecule/app-ide-react` to surface it as a chat card. Keeps app-specific events
  // (e.g. a host app's build/billing notices) OUT of this core union.
  | { type: 'custom'; name: string; data?: Record<string, unknown> }
  | {
      type: 'activity'
      activity: {
        id: string
        type: 'email' | 'sms' | 'push' | 'webhook' | 'channel'
        status: 'captured' | 'sent' | 'delivered' | 'failed'
        recipient?: string
        summary?: string
        timestamp: string
      }
    }
  // A transient, human-readable status for a background phase that is neither a
  // token stream nor a tool call — e.g. the post-response verification pass
  // ("Type-checking the API", "Linting the app", "Checking the preview loads").
  // The UI shows `label` in place of the rotating spinner messages so it's clear
  // what's happening right now; `label: null` clears it. Generic on purpose: the
  // app supplies the label text, so this core union stays free of any app-specific
  // phase vocabulary (same decoupling rule as the `custom` event above).
  | { type: 'status'; label: string | null }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number; contextWindow?: number } }
  | { type: 'error'; message: string; limitType?: string; requiresSignup?: boolean }
  // The active model changed (e.g. planner → executor); surfaced in the chat.
  | { type: 'model'; model: string; label?: string; mode?: 'plan' | 'execute' }
  // Post-discovery: the server is selecting a starting point / about to boot.
  | { type: 'designing' }
  // Discovery done + starting point chosen — the client boots the sandbox.
  | { type: 'ready_to_build' }
  // The agent asks the IDE to perform a non-mutating UI action (reload/navigate
  // the preview, open a file). Handled by the host app, not rendered in the chat.
  | {
      type: 'client_action'
      action: 'reload_preview' | 'navigate_preview' | 'open_file'
      path?: string
    }

/**
 * AI chat provider interface that all chat bond packages must implement.
 * Provides streaming message sending, abort, and conversation history management.
 */
export interface ChatProvider {
  readonly name: string

  /** Sends a message and streams the response via the event handler. */
  sendMessage(
    message: string,
    config: ChatConfig,
    onEvent: ChatEventHandler,
    attachments?: ChatAttachment[],
  ): Promise<void>

  /** Aborts the current streaming response. */
  abort(): void

  /** Clears the conversation history on the server. */
  clearHistory(config: ChatConfig): Promise<void>

  /** Loads the conversation history from the server. */
  loadHistory(config: ChatConfig): Promise<ChatMessage[]>
}
