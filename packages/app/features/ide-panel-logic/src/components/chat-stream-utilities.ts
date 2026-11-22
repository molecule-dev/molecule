/**
 * Helpers for the live streaming-message indicator (token estimate), the
 * effects a chat stream event produces, and the verification auto-fix countdown.
 *
 * {@link streamEventEffects} turns one stream event into the ordered list of
 * effects the panel applies (a usage update, a compaction card, an activity
 * card, a host callback, a notification sound) so every framework's chat panel
 * derives the same effects from the same event. {@link autoFixCountdownReducer}
 * is the pure state machine behind the auto-fix countdown: it holds the pending
 * verification errors, arms the three-second countdown when the turn ends, and
 * handles tick/pause/resume/cancel. The component owns the side effects — the
 * state setters, the interval, and the auto-sent message.
 *
 * @module
 */

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'

import type { IdeClientAction } from '../types.js'
import type { Activity } from './activity-utilities.js'
import { activityFromEvent } from './activity-utilities.js'
import type { SoundEventType, SoundsConfig } from './chat-settings-utilities.js'
import { shouldPlaySound } from './chat-settings-utilities.js'

/**
 * Cache of a tool input's serialized character length, keyed by the input object.
 * A completed tool input is immutable, so we serialize it ONCE and reuse the length
 * on every subsequent render. Without this, {@link estimateStreamTokens} ran a full
 * `JSON.stringify` over EVERY tool call's input — and a `write_file` input is the
 * whole file content — on every ~50ms stream flush. That is O(total content) per
 * flush, i.e. O(n²) across a build, which pegged the main thread and froze the IDE
 * on large builds. A WeakMap auto-evicts entries once the input objects are GC'd.
 */
const toolInputCharCache = new WeakMap<object, number>()

/**
 * Character length of a tool call's input, for the live token estimate. While the
 * input is still streaming, counts the bytes seen so far; once the final input has
 * arrived, serializes it ONCE and caches the length by object identity.
 * @param tc - The tool call.
 * @param tc.input - The final tool input, once it has fully arrived.
 * @param tc.streamInputChars - Bytes of the input received so far while streaming.
 * @returns Approximate character length of the input.
 */
export function toolInputChars(tc: { input?: unknown; streamInputChars?: number }): number {
  const input = tc.input
  // Still streaming — the final input object hasn't arrived; count bytes so far.
  if (input === undefined || input === null) return tc.streamInputChars ?? 0
  if (typeof input === 'object') {
    const cached = toolInputCharCache.get(input)
    if (cached !== undefined) return cached
    let len = 0
    try {
      len = JSON.stringify(input).length
    } catch (_error) {
      // Unserializable input (circular refs, BigInt, etc.) — 0 is a safe fallback;
      // the token estimate degrades gracefully and the caller never throws.
    }
    toolInputCharCache.set(input, len)
    return len
  }
  try {
    return JSON.stringify(input).length
  } catch (_error) {
    // Unserializable primitive (e.g. BigInt) — 0 is a safe fallback for the token estimate.
    return 0
  }
}

/**
 * Rough estimate of tokens generated so far in a streaming message (~4 chars/token),
 * from the assistant text + thinking content + tool-call inputs. Cheap to call on
 * every stream flush: string lengths are O(1) and each completed tool input's length
 * is cached (see {@link toolInputChars}), so this is O(blocks + toolCalls), NOT
 * O(total content) — the difference between a smooth stream and a frozen tab.
 * @param msg - The streaming assistant message.
 * @param msg.content - Accumulated assistant text.
 * @param msg.blocks - Ordered stream blocks (thinking content counts).
 * @param msg.toolCalls - Tool calls (their inputs count as generated output).
 * @returns The estimated token count.
 */
export function estimateStreamTokens(msg: {
  content?: string
  blocks?: Array<{ type: string; content?: string }>
  toolCalls?: Array<{ input?: unknown; streamInputChars?: number }>
}): number {
  let chars = msg.content?.length ?? 0
  for (const b of msg.blocks ?? []) {
    if (b.type === 'thinking') chars += b.content?.length ?? 0
  }
  for (const tc of msg.toolCalls ?? []) {
    chars += toolInputChars(tc)
  }
  return Math.round(chars / 4)
}

/** A chat message as seen by the turn-token estimator: role + the fields it sums. */
interface TurnTokenMessage {
  role: string
  hidden?: boolean
  content?: string
  blocks?: Array<{ type: string; content?: string }>
  toolCalls?: Array<{ input?: unknown; streamInputChars?: number }>
}

/**
 * Estimated tokens generated across the WHOLE current turn — the sum of every
 * assistant message back to (but excluding) the last genuine user message. This is
 * what the live activity counter should show: it must span the same turn as the
 * elapsed timer, so it climbs monotonically and merely PLATEAUS during tool-execution
 * gaps (when no message is streaming) instead of vanishing and restarting from ~0 at
 * each new assistant message — the cause of the "counter stops while the timer keeps
 * going" mismatch.
 *
 * The turn boundary is the last NON-hidden user message, so auto-continue rounds
 * (whose injected user messages are hidden) correctly count as part of the same turn.
 * Cost stays O(blocks + toolCalls across the turn) — `estimateStreamTokens` reads
 * O(1) string lengths and WeakMap-cached tool inputs — not O(total content).
 * @param messages - The full ordered message list (newest last).
 * @returns The estimated token count for the in-progress turn.
 */
export function estimateTurnTokens(messages: ReadonlyArray<TurnTokenMessage>): number {
  let total = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'user' && !m.hidden) break
    if (m.role === 'assistant') total += estimateStreamTokens(m)
  }
  return total
}

/**
 * The stream event shape the chat effects read: a `type` discriminator, an
 * optional context-usage sample, and any further event-specific fields.
 */
export interface StreamEvent {
  /** The event type discriminator. */
  type: string
  /** Context-usage sample carried by `context_usage` and `done` events. */
  usage?: Partial<ContextUsage>
  /** Any further event-specific field, read where that event defines it. */
  [key: string]: unknown
}

/** The panel state {@link streamEventEffects} reads to decide its effects. */
export interface StreamEventEffectState {
  /** The latest per-event sound modes. */
  soundsConfig: SoundsConfig
  /** Whether the page currently has focus (`document.hasFocus()` in the browser). */
  hasFocus: boolean
  /** Whether a teammate's pushed broadcast is being applied. */
  applyingPushed: boolean
}

/**
 * The effects one stream event produces, in the order the panel applies them:
 * a context-usage update, a compaction card, an activity card, the
 * ready-to-build signal, a forwarded client action, the turn-complete signal,
 * and a notification sound. The panel applies each to its own state, refs and
 * host callbacks.
 */
export type StreamEventEffect =
  | {
      /** A `context_usage` / `done` sample for the usage ring and history. */
      type: 'contextUsage'
      /** The complete usage sample to apply. */
      usage: ContextUsage
      /** Whether the sample came from the `done` event (its merge differs). */
      done: boolean
    }
  | {
      /** A completed compaction to add to the usage breakdown. */
      type: 'compaction'
      /** The compaction entry. */
      compaction: ContextCompaction
    }
  | {
      /** A captured outbound side effect to append as an activity card. */
      type: 'activityCard'
      /** The normalized activity. */
      activity: Activity
    }
  | {
      /** Discovery picked a starting point; the sender boots the sandbox. */
      type: 'readyToBuild'
    }
  | {
      /** The agent asked the IDE to drive the preview. */
      type: 'clientAction'
      /** The forwarded client action. */
      action: IdeClientAction
    }
  | {
      /** The turn finished (done or error). */
      type: 'turnComplete'
    }
  | {
      /** Play a notification tone. */
      type: 'playSound'
      /** Which tone: the plain status blip, or the octave-up team chime. */
      variant: 'default' | 'team'
    }

/**
 * Turns one chat stream event into its ordered effects — the framework-neutral
 * half of the panel's stream-event handler. The caller applies each effect to
 * its own React (or port) state, refs and host callbacks.
 *
 * Sender-only effects follow the same rule as the panel: a teammate's pushed
 * `ready_to_build` never boots this client's sandbox, and only a TEAMMATE's
 * `message` note plays the team chime (the sender's own echo is silent).
 *
 * @param event - The stream event.
 * @param state - The panel state the decision reads (sounds config, focus, whether a pushed frame is being applied).
 * @returns The effects to apply, in order.
 */
export function streamEventEffects(
  event: StreamEvent,
  state: StreamEventEffectState,
): StreamEventEffect[] {
  const effects: StreamEventEffect[] = []
  if (
    (event.type === 'context_usage' || event.type === 'done') &&
    typeof event.usage?.inputTokens === 'number' &&
    typeof event.usage.contextWindow === 'number'
  ) {
    const usage = event.usage as ContextUsage
    effects.push({ type: 'contextUsage', usage, done: event.type === 'done' })
  }
  if (
    event.type === 'compaction' &&
    typeof event.at === 'string' &&
    typeof event.compactedCount === 'number' &&
    typeof event.elapsedMs === 'number' &&
    typeof event.beforeChars === 'number' &&
    typeof event.afterChars === 'number'
  ) {
    const compaction: ContextCompaction = {
      at: event.at,
      compactedCount: event.compactedCount,
      elapsedMs: event.elapsedMs,
      beforeChars: event.beforeChars,
      afterChars: event.afterChars,
    }
    effects.push({ type: 'compaction', compaction })
  }
  // Captured outbound side effect (email/sms/push/webhook/channel) — push an
  // inline activity card into the timeline.
  if (event.type === 'activity' && event.activity) {
    effects.push({
      type: 'activityCard',
      activity: activityFromEvent(
        event.activity as {
          id?: string
          type?: string
          status?: string
          recipient?: string
          summary?: string
          timestamp?: string
        },
      ),
    })
  }
  // Discovery finished and the server selected a starting point — boot the
  // sandbox. SENDER-ONLY: the sender's client drives the boot.
  if (event.type === 'ready_to_build' && !state.applyingPushed) {
    effects.push({ type: 'readyToBuild' })
  }
  // The agent asked the IDE to reload/navigate the preview, open a file, or drive
  // the preview bridge. Forward EVERY IdeClientAction field.
  if (event.type === 'client_action' && typeof event.action === 'string') {
    const e = event as Record<string, unknown>
    const str = (k: string): string | undefined =>
      typeof e[k] === 'string' ? (e[k] as string) : undefined
    effects.push({
      type: 'clientAction',
      action: {
        action: event.action as IdeClientAction['action'],
        path: str('path'),
        requestId: str('requestId'),
        command: str('command') as IdeClientAction['command'],
        molId: str('molId'),
        selector: str('selector'),
        text: str('text'),
        value: str('value'),
      },
    })
  }
  // Turn finished (done OR error) — let the host know.
  if (event.type === 'done' || event.type === 'error') {
    effects.push({ type: 'turnComplete' })
  }
  const cfg = state.soundsConfig
  const eventType = event.type as SoundEventType
  // 'message' is the team-note ping: it fires only for a TEAMMATE's note
  // (the pushed broadcast) — never for the sender's own SSE echo.
  const isOwnTeamNote = event.type === 'message' && !state.applyingPushed
  if (!isOwnTeamNote && eventType in cfg && shouldPlaySound(cfg[eventType], state.hasFocus)) {
    effects.push({ type: 'playSound', variant: eventType === 'message' ? 'team' : 'default' })
  }
  return effects
}

/** Verification errors waiting for the stream to finish. */
export interface PendingVerification {
  /** The verification output shown in the auto-fix message. */
  output: string
  /** The verification categories that failed. */
  categories: string[]
  /** The changed paths a file change can match to cancel the fix. */
  changedPaths: string[]
}

/** The active auto-fix countdown. */
export interface AutoFixCountdown {
  /** The verification output shown in the auto-fix message. */
  output: string
  /** The verification categories that failed. */
  categories: string[]
  /** The changed paths a file change can match to cancel the fix. */
  changedPaths: string[]
  /** Seconds left until the fix message is sent. */
  secondsLeft: number
  /** Whether the user paused the countdown. */
  paused: boolean
}

/** The verification auto-fix state: pending errors and the live countdown. */
export interface AutoFixState {
  /** Verification errors captured from the stream, armed when the turn ends. */
  pending: PendingVerification | null
  /** The countdown currently shown at the bottom of the chat, or `null`. */
  countdown: AutoFixCountdown | null
}

/** The idle auto-fix state — the reducer's initial value. */
export const AUTO_FIX_IDLE: AutoFixState = { pending: null, countdown: null }

/** The actions the auto-fix reducer accepts. */
export type AutoFixAction =
  | {
      /** A verification result from the stream. */
      type: 'verificationResult'
      /** Whether verification passed or failed. */
      status: 'ok' | 'error'
      /** The verification output (only meaningful for an error). */
      output?: string
      /** The failed categories (defaults to an empty list). */
      categories?: string[]
      /** The changed paths (defaults to an empty list). */
      changedPaths?: string[]
      /** Whether a teammate's pushed broadcast is being applied (sender-only arming). */
      applyingPushed: boolean
    }
  | {
      /** The turn finished; arm the countdown when verification had failed. */
      type: 'done'
    }
  | {
      /** One second of the countdown elapsed; the last second clears it. */
      type: 'tick'
    }
  | {
      /** Pause the countdown (e.g. the user started typing). */
      type: 'pause'
    }
  | {
      /** Resume the countdown, restarting at three seconds. */
      type: 'resume'
    }
  | {
      /** Dismiss the countdown without sending. */
      type: 'cancel'
    }
  | {
      /** Clear the pending errors and the countdown (the user stopped the turn). */
      type: 'reset'
    }

/**
 * Pure reducer for the verification auto-fix countdown. Deterministic and
 * side-effect free: the component sends the fix message when a `tick` on the
 * last second clears the countdown, then applies the returned state.
 *
 * @param state - The current auto-fix state.
 * @param action - The action to apply.
 * @returns The next auto-fix state.
 */
export function autoFixCountdownReducer(state: AutoFixState, action: AutoFixAction): AutoFixState {
  switch (action.type) {
    case 'verificationResult':
      // SENDER-ONLY arming: a pushed frame from a teammate's turn must not arm
      // this client's auto-fix. A clean result always clears the pending errors.
      if (action.status === 'ok') return { ...state, pending: null }
      if (action.applyingPushed || !action.output) return state
      return {
        ...state,
        pending: {
          output: action.output,
          categories: action.categories ?? [],
          changedPaths: action.changedPaths ?? [],
        },
      }
    case 'done':
      // When the stream ends, start the countdown if verification errors are pending.
      if (!state.pending) return state
      return { pending: null, countdown: { ...state.pending, secondsLeft: 3, paused: false } }
    case 'tick':
      if (!state.countdown || state.countdown.paused) return state
      if (state.countdown.secondsLeft > 1) {
        return {
          ...state,
          countdown: { ...state.countdown, secondsLeft: state.countdown.secondsLeft - 1 },
        }
      }
      // Last second: the countdown is done; the component sends the fix message.
      return { ...state, countdown: null }
    case 'pause':
      if (!state.countdown || state.countdown.paused) return state
      return { ...state, countdown: { ...state.countdown, paused: true } }
    case 'resume':
      if (!state.countdown) return state
      return { ...state, countdown: { ...state.countdown, paused: false, secondsLeft: 3 } }
    case 'cancel':
      if (!state.countdown) return state
      return { ...state, countdown: null }
    case 'reset':
      return AUTO_FIX_IDLE
  }
}
