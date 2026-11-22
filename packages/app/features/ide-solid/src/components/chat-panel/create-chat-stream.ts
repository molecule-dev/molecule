/**
 * `chat:stream` — the stream-event handler: context usage, compaction,
 * verification, activity, `ready_to_build`, `client_action`, turn completion
 * and sounds (React's two `chat:stream` regions, ported by unit U5).
 *
 * The handler is what the chat session calls for every server event, and what
 * `applyPushedStreamEvent` calls for a teammate's broadcast frame. The
 * framework-neutral half is `streamEventEffects` from
 * `@molecule/app-ide-panel-logic/panels`: it turns one event into the ordered
 * effects the panel applies. This slice applies each to the panel's own state,
 * refs and host callbacks in that order, and arms the verification auto-fix
 * countdown (sender-only) before them.
 *
 * @module
 */

import type { ChatStreamEvent } from '@molecule/app-ai-chat'
import type { Activity } from '@molecule/app-ide-panel-logic'
import type { SoundsConfig } from '@molecule/app-ide-panel-logic/panels'
import {
  DEFAULT_SOUNDS_CONFIG,
  mergeContextHistory,
  playTone,
  streamEventEffects,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What the rest of the panel reads from `chat:stream`. */
export interface ChatStreamSlice {
  /** The sound preferences, readable from the memoized stream handler. */
  soundsConfigRef: MutableRef<SoundsConfig>
  /** The activity-card adder, filled once the activity slice exists. */
  addActivityCardRef: MutableRef<((activity: Activity) => void) | null>
  /** True only while applying a teammate's broadcast event. */
  applyingPushedRef: MutableRef<boolean>
  /** Handles one stream event from the session (or a pushed frame). */
  handleStreamEvent: (event: ChatStreamEvent) => void
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Creates `chat:stream`.
 * @param ctx - The inner ctx (context-usage, auto-fix and the host callbacks).
 * @returns The stream slice.
 */
export function createChatStream(ctx: ChatInnerCtx): ChatStreamSlice {
  // Ref for the sounds config so the handler always reads the latest value.
  const soundsConfigRef: MutableRef<SoundsConfig> = { current: { ...DEFAULT_SOUNDS_CONFIG } }
  // Filled once, by the activity slice, with that stable callback.
  const addActivityCardRef: MutableRef<((activity: Activity) => void) | null> = { current: null }
  // True only while applying a teammate's broadcast through the handler.
  const applyingPushedRef: MutableRef<boolean> = { current: false }

  /**
   * Handles one stream event: arms the auto-fix countdown for a failed
   * verification, clears it for a clean one, arms the countdown when the turn
   * ends, then applies every other effect the event produces, in order.
   * @param event - The stream event the session (or a pushed frame) reported.
   */
  const handleStreamEvent = (event: ChatStreamEvent): void => {
    const applyingPushed = applyingPushedRef.current
    // Capture verification errors to trigger countdown after stream ends —
    // SENDER-ONLY: a pushed frame from a teammate's turn must not arm this
    // client's auto-fix (the sender's client owns the follow-up; two clients
    // arming it would double-send the fix).
    // Also drop any deferred preview error — verification's countdown handles it.
    if (event.type === 'verification_result' && event.status === 'error') {
      if (!applyingPushed && event.output) ctx.autoFix.deferredPendingRef.current = null
      ctx.autoFix.dispatchAutoFix({
        type: 'verificationResult',
        status: 'error',
        output: event.output,
        categories: event.categories ?? [],
        changedPaths: event.changedPaths ?? [],
        applyingPushed,
      })
    }
    // Clear pending verification if a new verification comes back clean
    if (event.type === 'verification_result' && event.status === 'ok') {
      ctx.autoFix.dispatchAutoFix({ type: 'verificationResult', status: 'ok', applyingPushed })
    }
    // When stream ends, start countdown if there are pending verification errors
    if (event.type === 'done') {
      ctx.autoFix.dispatchAutoFix({ type: 'done' })
    }
    // Apply every effect the event produces, in order (usage, compaction,
    // activity, ready-to-build, client action, turn complete, notification sound).
    for (const effect of streamEventEffects(event, {
      soundsConfig: soundsConfigRef.current,
      hasFocus: document.hasFocus(),
      applyingPushed,
    })) {
      switch (effect.type) {
        case 'contextUsage':
          ctx.contextUsage.setContextUsage((previous) => {
            if (!previous) return effect.usage
            if (effect.usage.requestId || effect.usage.at)
              return mergeContextHistory([previous], [effect.usage]).at(-1) ?? effect.usage
            return effect.done ? { ...previous, ...effect.usage } : effect.usage
          })
          ctx.contextUsage.setContextHistory((previous) =>
            mergeContextHistory(previous, [effect.usage]),
          )
          break
        case 'compaction':
          ctx.contextUsage.setContextCompactions((previous) =>
            [
              ...previous.filter((item) => item.at !== effect.compaction.at),
              effect.compaction,
            ].slice(-32),
          )
          break
        // Captured outbound side effect (email/sms/push/webhook/channel) — push
        // an inline activity card into the timeline.
        case 'activityCard':
          addActivityCardRef.current?.(effect.activity)
          break
        // Discovery finished and the server selected a starting point — boot the
        // sandbox. SENDER-ONLY (the effect is only produced for the sender).
        case 'readyToBuild':
          ctx.props.onReadyToBuild?.()
          break
        // The agent asked the IDE to reload/navigate the preview, open a file, or
        // drive the preview bridge. Forward to the host; nothing is rendered.
        case 'clientAction':
          ctx.props.onClientAction?.(effect.action)
          break
        // Turn finished (done OR error) — let the host know. Firing on error too
        // prevents a failed stream from stranding the boot view forever.
        case 'turnComplete':
          ctx.props.onTurnComplete?.()
          break
        case 'playSound':
          playTone(effect.variant)
          break
      }
    }
  }

  return {
    soundsConfigRef,
    addActivityCardRef,
    applyingPushedRef,
    handleStreamEvent,
    effects: {},
  }
}
