/**
 * React's `chat:stream` regions of ChatPanel.tsx (lines 520–523 and 627–744):
 * the stream-event handler — context usage, compaction, verification,
 * activity, `ready_to_build`, `client_action`, turn completion and sounds.
 *
 * The handler is what the chat session calls for every server event, and what
 * `applyPushedStreamEvent` calls for a teammate's broadcast frame. The
 * framework-neutral half is `streamEventEffects` from
 * `@molecule/app-ide-panel-logic/panels`: it turns one event into the ordered
 * effects the panel applies. This slice applies each to the panel's own state,
 * refs and host callbacks in that order, and arms the verification auto-fix
 * countdown (sender-only) before them.
 *
 * The refs are React's three: the latest sounds configuration (kept in step by
 * `chat:sounds`), the activity-card adder (filled once by `chat:activity`) and
 * the flag that marks a teammate's broadcast being applied (set around the
 * call by `chat:system-cards`). They are plain objects, not signals, exactly
 * as React's `useRef` values are. Other slices are looked up through
 * {@link ChatInnerState.slice} at call time, the way every slice in this port
 * resolves its neighbours.
 *
 * @module
 */

import { inject, Injectable } from '@angular/core'

import type { ContextUsage } from '@molecule/app-ai-chat'
import type { Activity } from '@molecule/app-ide-panel-logic'
import {
  DEFAULT_SOUNDS_CONFIG,
  mergeContextHistory,
  playTone,
  type SoundsConfig,
  streamEventEffects,
} from '@molecule/app-ide-panel-logic/panels'

import { ChatAutoFix } from './chat-auto-fix.slice.js'
import { ChatContextUsage } from './chat-context-usage.slice.js'
import { ChatInnerState } from './chat-inner-state.js'

/** React's stream-event shape: the kind, optional usage, and every other server field. */
export interface ChatStreamEventLike {
  /** The event kind. */
  type: string
  /** Provider-reported context usage on `context_usage` / `done`. */
  usage?: Partial<ContextUsage>
  /** Every other field the server sent, read by kind. */
  [key: string]: unknown
}

/** The identifiers other slices and sections read from the `chat:stream` slice. */
export interface ChatStreamSlice {
  /** React's mount I/O for the region (the handler needs none). */
  mount(): void

  /** Handles one server stream event. */
  readonly handleStreamEvent: (event: ChatStreamEventLike) => void
  /** Set while a pushed (teammate) event is being applied, so echoes are not re-broadcast. */
  readonly applyingPushedRef: { current: boolean }
  /** Filled by the activity slice so the stream can publish activity cards. */
  readonly addActivityCardRef: { current: ((activity: Activity) => void) | null }
  /** The latest sounds configuration, read by the handler without a stale closure. */
  readonly soundsConfigRef: { current: SoundsConfig }
}

/** React's `chat:stream` slice: the one stream-event handler. */
@Injectable()
export class ChatStream implements ChatStreamSlice {
  /** The shared state, read for the host callbacks the effects call. */
  private readonly state = inject(ChatInnerState)

  /** Set while a pushed (teammate) event is being applied (React's ref, initial `false`). */
  readonly applyingPushedRef: { current: boolean } = { current: false }

  /** Filled by the activity slice so the stream can publish activity cards (React's ref). */
  readonly addActivityCardRef: { current: ((activity: Activity) => void) | null } = {
    current: null,
  }

  /** The latest sounds configuration (React's ref, initial the default config). */
  readonly soundsConfigRef: { current: SoundsConfig } = { current: { ...DEFAULT_SOUNDS_CONFIG } }

  /** React's mount I/O for the region: the handler has none outside its callbacks. */
  mount(): void {
    // `chat:stream` has no mount I/O: its refs are initialized at construction
    // and its handler runs when the session reports an event, as in React.
  }

  /**
   * Handles one stream event: arms the auto-fix countdown for a failed
   * verification, clears it for a clean one, arms the countdown when the turn
   * ends, then applies every other effect the event produces, in order.
   *
   * @param event - The stream event the session (or a pushed frame) reported.
   */
  readonly handleStreamEvent = (event: ChatStreamEventLike): void => {
    const applyingPushed = this.applyingPushedRef.current
    const autoFix = this.state.slice(ChatAutoFix)
    // Capture verification errors to trigger countdown after stream ends —
    // SENDER-ONLY: a pushed frame from a teammate's turn must not arm this
    // client's auto-fix (the sender's client owns the follow-up; two clients
    // arming it would double-send the fix).
    // Also drop any deferred preview error — verification's countdown handles it.
    if (event.type === 'verification_result' && event.status === 'error') {
      if (!applyingPushed && event.output) autoFix.deferredPendingRef.current = null
      autoFix.dispatchAutoFix({
        type: 'verificationResult',
        status: 'error',
        output: event.output ? (event.output as string) : undefined,
        categories: (event.categories as string[]) ?? [],
        changedPaths: (event.changedPaths as string[]) ?? [],
        applyingPushed,
      })
    }
    // Clear pending verification if a new verification comes back clean
    if (event.type === 'verification_result' && event.status === 'ok') {
      autoFix.dispatchAutoFix({ type: 'verificationResult', status: 'ok', applyingPushed })
    }
    // When stream ends, start countdown if there are pending verification errors
    if (event.type === 'done') {
      autoFix.dispatchAutoFix({ type: 'done' })
    }
    const contextUsage = this.state.slice(ChatContextUsage)
    // Apply every effect the event produces, in order (usage, compaction,
    // activity, ready-to-build, client action, turn complete, notification sound).
    for (const effect of streamEventEffects(event, {
      soundsConfig: this.soundsConfigRef.current,
      hasFocus: document.hasFocus(),
      applyingPushed,
    })) {
      switch (effect.type) {
        case 'contextUsage':
          contextUsage.setContextUsage((previous) => {
            if (!previous) return effect.usage
            if (effect.usage.requestId || effect.usage.at)
              return mergeContextHistory([previous], [effect.usage]).at(-1) ?? effect.usage
            return effect.done ? { ...previous, ...effect.usage } : effect.usage
          })
          contextUsage.setContextHistory((previous) =>
            mergeContextHistory(previous, [effect.usage]),
          )
          break
        case 'compaction':
          contextUsage.setContextCompactions((previous) =>
            [
              ...previous.filter((item) => item.at !== effect.compaction.at),
              effect.compaction,
            ].slice(-32),
          )
          break
        // Captured outbound side effect (email/sms/push/webhook/channel) — push
        // an inline activity card into the timeline.
        case 'activityCard':
          this.addActivityCardRef.current?.(effect.activity)
          break
        // Discovery finished and the server selected a starting point — boot the
        // sandbox. SENDER-ONLY (the effect is only produced for the sender).
        case 'readyToBuild':
          this.state.props().onReadyToBuild?.()
          break
        // The agent asked the IDE to reload/navigate the preview, open a file, or
        // drive the preview bridge. Forward it to the host; nothing is rendered.
        case 'clientAction':
          this.state.props().onClientAction?.(effect.action)
          break
        // Turn finished (done OR error) — let the host know. Firing on error too
        // prevents a failed stream from stranding the boot view forever.
        case 'turnComplete':
          this.state.props().onTurnComplete?.()
          break
        case 'playSound':
          playTone(effect.variant)
          break
      }
    }
  }
}
