# @molecule/app-ai-chat

AI chat core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-chat
```

## API

### Interfaces

#### `AttachmentMeta`

Attachment metadata stored in message history (no base64 data).

```typescript
interface AttachmentMeta {
  /** Original filename. */
  filename: string
  /** MIME type. */
  mediaType: string
  /** File size in bytes. */
  size: number
}
```

#### `ChatAttachment`

A file attachment sent with a chat message.

```typescript
interface ChatAttachment {
  /** MIME type (e.g., 'image/jpeg', 'application/pdf'). */
  mediaType: string
  /** Base64-encoded file data (no data-URL prefix). */
  data: string
  /** Original filename for display. */
  filename: string
  /** File size in bytes (for validation and display). */
  size: number
}
```

#### `ChatConfig`

Configuration for a chat session, including the API endpoint,
project context, and optional model/prompt overrides.

```typescript
interface ChatConfig {
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
  /**
   * When true, this send is an internal driver (e.g. the post-boot build
   * kickoff): the server persists the user message as `hidden` so it never
   * appears in history, and the optimistic local bubble is suppressed. The text
   * is still sent to the model. (Sent to the server in the request body — this
   * is NOT a client-only toggle.)
   */
  suppressUserMessage?: boolean
  /**
   * When true, this send was issued automatically on the user's behalf (e.g. an
   * auto-fix prompt): the server persists the user message with `automatic` set
   * so it stays visible but renders in the distinct auto-sent style.
   */
  automatic?: boolean
}
```

#### `ChatMessage`

A single message in a chat conversation, including role, content,
and optional tool-call metadata.

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** Ordered sequence of text and tool-call blocks, preserving interleaved order. */
  blocks?: MessageBlock[]
  /**
   * Present when this message IS an inline transcript card (not a dialogue turn) —
   * a model-switch / phase / skills / custom notice. Carries the raw {@link CardEvent}
   * the UI renders the card from. Such a message has `role: 'system'`, is shown +
   * persisted in the same transcript as every other message (so live === stored), and
   * is excluded from the model request server-side. Render by `cardEvent`, not `content`.
   */
  cardEvent?: CardEvent
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
  /**
   * Internal driver message (e.g. the post-boot build kickoff) that the user
   * must NEVER see: it is filtered from history on read and never rendered,
   * though the model still reads it during the turn it drives. This persisted
   * flag is the deterministic replacement for the legacy `[auto-continue]`
   * content-prefix hack — a hidden message can never reappear after a refresh.
   */
  hidden?: boolean
  /**
   * A message sent automatically on the user's behalf (e.g. an auto-fix prompt)
   * that SHOULD stay visible — but rendered so it is obvious it was sent
   * automatically on behalf of the agent, not typed by the user (distinct
   * avatar + accent border), never styled like a real user message.
   */
  automatic?: boolean
  /**
   * Author of this message. Optional + solo-safe: when absent, the UI falls back to
   * the signed-in user (for `role: 'user'`) or the agent (for `role: 'assistant'`).
   * Populated per-message once real-time multi-user collaboration lands, so each
   * message shows WHO sent it (name + avatar) — not just "you" vs the agent.
   */
  author?: MessageAuthor
}
```

#### `ChatProvider`

AI chat provider interface that all chat bond packages must implement.
Provides streaming message sending, abort, and conversation history management.

```typescript
interface ChatProvider {
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
```

#### `ChatState`

Reactive state for a chat session, including messages, loading state,
error state, and WebSocket connection status.

```typescript
interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}
```

#### `CommitSuggestion`

A suggested git commit after file changes, shown to the user for one-click committing.

```typescript
interface CommitSuggestion {
  files: string[]
  message?: string
  status: 'pending' | 'committing' | 'committed' | 'error'
}
```

#### `MessageAuthor`

Identity of a message's sender, for (eventually) multi-participant conversations.

```typescript
interface MessageAuthor {
  /** Stable sender id — a user id; absent for the AI agent. */
  id?: string
  /** Display name for the message header (a teammate's name, or the agent's name). */
  name?: string
  /** Avatar value — inline `data:image/*` URI or `http(s)` URL; null/absent → icon fallback. */
  avatar?: string | null
}
```

#### `ToolCall`

A tool invocation within an assistant message, tracking its lifecycle
from pending through completion or error.

```typescript
interface ToolCall {
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
```

### Types

#### `CardEvent`

The RAW payload of an inline transcript card (model-switch notice, "Building your
app" phase marker, "Loaded N skills", and app-specific custom cards). A card is
persisted as a `role: 'system'` {@link ChatMessage} carrying this in `cardEvent`,
so it lives in the ONE message transcript (live === stored) instead of a separate
store. The card's user-facing copy/actions/tone are built from this payload at
RENDER time — identically live and on reload — keeping app-specific text out of the
shared packages (the server records the data; the app renders it).

```typescript
type CardEvent =
  | { kind: 'model'; model: string; label?: string; mode?: 'plan' | 'execute' }
  | { kind: 'mode'; mode: 'plan' | 'execute' }
  | { kind: 'skills'; count: number }
  | { kind: 'custom'; name: string; data?: Record<string, unknown> }
```

#### `ChatEventHandler`

Callback invoked for each event in a streaming chat response.

```typescript
type ChatEventHandler = (event: ChatStreamEvent) => void
```

#### `ChatStreamEvent`

Discriminated union of events emitted during a streaming chat response.
Events include text chunks, tool invocations, tool results, completion,
and errors.

```typescript
type ChatStreamEvent =
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
  // The server is opening a new persisted assistant message (one per agentic-loop
  // iteration). Carries the STABLE id + the server timestamp (ms) the message will be
  // persisted with, so the live transcript builds the SAME per-message structure the
  // server stores — every stream item after this belongs to this message until the next
  // `message_start`. There is NO per-message terminal event: finalization is driven
  // solely by the next `message_start` (finalize the previous) and the final
  // `done`/`error` (finalize the last). `timestamp` is ms and equals
  // `new Date(persistedISO).getTime()` so the live message is byte-identical to history.
  | { type: 'message_start'; id: string; timestamp: number }
  // An inline transcript CARD (model-switch / phase / skills / custom notice), recorded
  // by the server as a `role:'system'` message in the ONE transcript and emitted live with
  // the SAME `id` + `timestamp` it is persisted with — so the card the client renders live
  // is byte-identical to the one it loads on refresh (no separate card store, no client
  // decision). The app builds the card's copy/actions from `card` at render time.
  | { type: 'card'; id: string; timestamp: number; card: CardEvent }
  // `timestamp` (ms, server clock) is when the transition occurred — set so any card
  // the app derives from this event sorts on the SAME clock as the messages (which are
  // server-stamped via `message_start`), instead of a client-receipt time that can skew
  // the card above/below the response. Optional + additive; consumers fall back to now.
  | { type: 'mode'; mode: 'plan' | 'execute'; timestamp?: number }
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
  // Generic extension point for app-specific stream events the SHARED package knows
  // nothing about. A consuming app emits `{ type: 'custom', name, data }` and (for
  // the react IDE) registers a renderer via `registerCustomEventCard(name, …)` from
  // `@molecule/app-ide-react` to surface it as a chat card. This is how an app-specific
  // notice (e.g. molecule.dev's `upgrade_prompt` / `guest_reminder` / `build_degraded`
  // upgrade-and-billing cards) stays OUT of this core union — the app owns its own
  // event names + copy + routes, not this package.
  // `timestamp` (ms, server clock): when the event was emitted, so a card derived from it
  // sorts on the SAME monotonic clock as the messages (see the `mode`/`model` events).
  // Optional + additive; a consumer falls back to the client clock when it's absent.
  | { type: 'custom'; name: string; data?: Record<string, unknown>; timestamp?: number }
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
  | {
      type: 'error'
      message: string
      /**
       * HTTP status code of the failed backend response, when the error
       * originated from a non-ok HTTP response (e.g. `503`). Absent for
       * transport/stream errors that never produced a response. Consumers use it
       * to distinguish a retryable server error (5XX) — which should back off and
       * auto-resume — from a client error (4XX) or a limit/quota gate, which
       * should not. Additive + optional, so emitting it is backward-compatible.
       */
      status?: number
      limitType?: string
      requiresSignup?: boolean
    }
  // The active model changed (e.g. planner → executor); surfaced in the chat.
  // `timestamp` (ms, server clock): see the `mode` event above — same card-clock fix.
  | { type: 'model'; model: string; label?: string; mode?: 'plan' | 'execute'; timestamp?: number }
  // Post-discovery: the server is selecting a starting point / about to boot.
  | { type: 'designing' }
  // Discovery done + starting point chosen — the client boots the sandbox.
  | { type: 'ready_to_build' }
  // The agent asks the IDE to perform a non-mutating UI action (reload/navigate
  // the preview, open a file, or drive the preview's interaction bridge).
  // Handled by the host app, not rendered in the chat.
  | {
      type: 'client_action'
      action: 'reload_preview' | 'navigate_preview' | 'open_file' | 'preview_ui'
      path?: string
      /** preview_ui: correlates the command with its ui-result round-trip. */
      requestId?: string
      /** preview_ui: the interaction the preview bridge should perform. */
      command?: 'snapshot' | 'click' | 'fill' | 'select' | 'waitFor'
      /** preview_ui: the `data-mol-id` of the target element (preferred). */
      molId?: string
      /** preview_ui: CSS-selector fallback when no molId is available. */
      selector?: string
      /** preview_ui: visible-label match for apps whose elements carry no molId. */
      text?: string
      /** preview_ui: value to set for fill/select. */
      value?: string
    }
```

#### `MessageBlock`

An ordered block within an assistant message, preserving the interleaved
sequence of text chunks and tool calls as they were received from the stream.

```typescript
type MessageBlock =
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
```

### Functions

#### `getProvider()`

Retrieves the bonded AI chat provider, or `null` if none is bonded.

```typescript
function getProvider(): ChatProvider | null
```

**Returns:** The bonded chat provider, or `null`.

#### `hasProvider()`

Checks whether an AI chat provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an AI chat provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI chat provider, throwing if none is configured.

```typescript
function requireProvider(): ChatProvider
```

**Returns:** The bonded chat provider.

#### `setProvider(provider)`

Registers an AI chat provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: ChatProvider): void
```

- `provider` — The chat provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| HTTP | `@molecule/app-ai-chat-http` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

Chat runs through YOUR backend, not the AI provider directly. Bond a chat provider (e.g.
`@molecule/app-ai-chat-http`) pointed at your API's chat endpoint; the frontend sends
messages there and streams the reply over SSE. The AI provider API key lives ONLY in your API
(see `@molecule/api-ai`) — the browser NEVER calls Anthropic/OpenAI directly or holds a
provider key, which would ship the key to every user.

- **Render model output safely.** Never `dangerouslySetInnerHTML` / `v-html` a raw model
  response — a model (or an injected prompt) can emit `<script>`/HTML. Render markdown through
  a sanitizing renderer.
- Model output is UNTRUSTED (see api-ai): a tool call or action it suggests must be authorized
  + validated server-side, never auto-executed from the client.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Sending a message renders it in the thread and a streamed assistant
  reply appears incrementally (visible tokens while generating — not a
  frozen UI that dumps one blob).
- [ ] The reply flows through the app's OWN backend: the browser's network
  log shows no direct calls to an AI provider and no provider key anywhere
  client-side.
- [ ] Model output renders as sanitized markdown — a reply containing HTML
  or `<script>` displays as text and never executes.
- [ ] If the app claims conversation persistence, reloading restores the
  thread history.
- [ ] A backend failure (endpoint down, missing API key) surfaces a readable,
  actionable error — not an infinite spinner.
- [ ] Sending again while a reply streams is handled sanely (queued, blocked,
  or parallel — never corrupted/interleaved text).

## Translations

Translation strings are provided by `@molecule/app-locales-ai-chat`.
