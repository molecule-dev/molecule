/**
 * `chat:stream` — the stream-event handler, ported from React's two `chat:stream`
 * regions. The handler is what `useChat` calls for every server event; it drives
 * usage, compactions, verification, activity, `ready_to_build`, `client_action`,
 * turn completion and the notification sounds.
 *
 * The framework-neutral half is `streamEventEffects` from
 * `@molecule/app-ide-panel-logic/panels`: it turns one event into the ordered
 * effects the panel applies. This slice applies each effect to the panel's own
 * state, refs and host callbacks, in the same order React's handler does, and
 * arms the verification auto-fix countdown (sender-only) before them.
 *
 * @module
 */

import type { Activity } from '@molecule/app-ide-panel-logic'
import {
  DEFAULT_SOUNDS_CONFIG,
  mergeContextHistory,
  playTone,
  type SoundsConfig,
  streamEventEffects,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatStreamEventLike, MutableRef } from './context.js'

/** What the `chat:stream` slice exposes. */
export interface ChatStreamSlice {
  /** Handles one server stream event. */
  readonly handleStreamEvent: (event: ChatStreamEventLike) => void
  /** Set while a pushed (teammate) event is being applied, so echoes are not re-broadcast. */
  readonly applyingPushedRef: MutableRef<boolean>
  /** Filled by the activity slice so the stream can publish activity cards. */
  readonly addActivityCardRef: MutableRef<((activity: Activity) => void) | null>
  /** The latest sounds configuration, read by the handler without a stale closure. */
  readonly soundsConfigRef: MutableRef<SoundsConfig>
}

/**
 * Builds the `chat:stream` slice.
 *
 * @param ctx - The panel context (the context-usage state, auto-fix and host callbacks).
 * @returns The stream slice.
 */
export function createChatStream(ctx: ChatCtx): ChatStreamSlice {
  // Ref for sounds config so the handler always reads the latest value.
  const soundsConfigRef: MutableRef<SoundsConfig> = { current: { ...DEFAULT_SOUNDS_CONFIG } }
  // Filled once by the activity slice (which reads the chat's messages).
  const addActivityCardRef: MutableRef<((activity: Activity) => void) | null> = { current: null }
  // True only while applying a teammate's broadcast through the handler.
  const applyingPushedRef: MutableRef<boolean> = { current: false }

  /**
   * Handles one server stream event: arms the auto-fix countdown for a failed
   * verification, clears it for a clean one or the turn's end, then applies
   * every other effect the event produces, in order.
   *
   * @param event - The stream event the session reported.
   */
  const handleStreamEvent = (event: ChatStreamEventLike): void => {
    const applyingPushed = applyingPushedRef.current
    // Capture verification errors to trigger countdown after stream ends —
    // SENDER-ONLY: a pushed frame from a teammate's turn must not arm this
    // client's auto-fix. Also drop any deferred preview error — verification's
    // countdown handles it.
    if (event.type === 'verification_result' && event.status === 'error') {
      if (!applyingPushed && event.output) ctx.autoFix.deferredPendingRef.current = null
      ctx.autoFix.dispatchAutoFix({
        type: 'verificationResult',
        status: 'error',
        output: event.output ? (event.output as string) : undefined,
        categories: (event.categories as string[]) ?? [],
        changedPaths: (event.changedPaths as string[]) ?? [],
        applyingPushed,
      })
    }
    // Clear pending verification if a new verification comes back clean.
    if (event.type === 'verification_result' && event.status === 'ok') {
      ctx.autoFix.dispatchAutoFix({ type: 'verificationResult', status: 'ok', applyingPushed })
    }
    // When stream ends, start countdown if there are pending verification errors.
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
        // drive the preview bridge. Forward to the host.
        case 'clientAction':
          ctx.props.onClientAction?.(effect.action)
          break
        // Turn finished (done OR error) — let the host know.
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
    handleStreamEvent,
    applyingPushedRef,
    addActivityCardRef,
    soundsConfigRef,
  }
}
