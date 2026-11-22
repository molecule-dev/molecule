/**
 * React's two `chat:stream` regions of ChatPanel.tsx (lines 520–523 and
 * 627–744): the refs the memoized stream handler reads — the latest sound modes,
 * the activity-card adder, and the "a teammate's broadcast is being applied"
 * flag — and the handler itself, which arms the verification auto-fix countdown
 * (sender-only) and then applies every effect the event produces, in order:
 * context usage, compaction, activity card, ready-to-build, client action, turn
 * complete and the notification sound.
 *
 * The framework-neutral half is `streamEventEffects` from
 * `@molecule/app-ide-panel-logic/panels`: it turns one event into the ordered
 * effects every framework's panel applies. The host callbacks are read from the
 * props at call time, which is React's `useStableCallback` — the handler always
 * calls the handlers of the latest committed render.
 *
 * @module
 */

import type { ChatStreamEvent } from '@molecule/app-ai-chat'
import type { Activity } from '@molecule/app-ide-panel-logic'
import {
  DEFAULT_SOUNDS_CONFIG,
  mergeContextHistory,
  playTone,
  type SoundsConfig,
  streamEventEffects,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:stream` slice. */
export interface ChatStreamSlice {
  /** The sound preferences, readable from the memoized stream handler. */
  readonly soundsConfigRef: MutableRef<SoundsConfig>
  /** The activity-card adder, filled once the activity slice exists. */
  readonly addActivityCardRef: MutableRef<((activity: Activity) => void) | null>
  /** True only while applying a teammate's broadcast event. */
  readonly applyingPushedRef: MutableRef<boolean>
  /** Handles one stream event from the session (or a pushed frame). */
  readonly handleStreamEvent: (event: ChatStreamEvent) => void

  /** React's mount I/O for the region: none — it declares three refs. */
  mount(): void
}

/**
 * Creates the `chat:stream` slice.
 *
 * @param ctx - The shared chat context (the usage state, the auto-fix slice and the props).
 * @returns The three refs, the stream handler and the (empty) mount.
 */
export function createChatStream(ctx: ChatContext): ChatStreamSlice {
  /** React's `soundsConfigRef` — the sound modes the memoized handler reads. */
  const soundsConfigRef: MutableRef<SoundsConfig> = { current: { ...DEFAULT_SOUNDS_CONFIG } }
  /** React's `addActivityCardRef` — filled once the activity slice exists. */
  const addActivityCardRef: MutableRef<((activity: Activity) => void) | null> = { current: null }
  /** React's `applyingPushedRef` — true only while applying a pushed frame. */
  const applyingPushedRef: MutableRef<boolean> = { current: false }

  /**
   * Handles one stream event: arms or clears the verification auto-fix countdown
   * (sender-only) and then applies every effect the event produces, in order.
   *
   * @param event - The stream event the session (or a pushed frame) reported.
   */
  const handleStreamEvent = (event: ChatStreamEvent): void => {
    const applyingPushed = applyingPushedRef.current
    // Capture verification errors to trigger countdown after the stream ends —
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
    // Clear pending verification if a new verification comes back clean.
    if (event.type === 'verification_result' && event.status === 'ok') {
      ctx.autoFix.dispatchAutoFix({ type: 'verificationResult', status: 'ok', applyingPushed })
    }
    // When the stream ends, start the countdown if verification errors are pending.
    if (event.type === 'done') {
      ctx.autoFix.dispatchAutoFix({ type: 'done' })
    }
    // NOTE: pushed `card` / `message` events are ingested into the message store by
    // the session (the pushed-frame path calls that before this handler), through
    // the same append helpers as an own stream — no panel-side append here.
    // Apply every effect the event produces, in order (usage, compaction, activity,
    // ready-to-build, client action, turn complete, notification sound).
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
        // Captured outbound side effect (email/sms/push/webhook/channel) — push an
        // inline activity card into the timeline. Non-text card, mirroring how
        // system cards are appended.
        case 'activityCard':
          addActivityCardRef.current?.(effect.activity)
          break
        // Discovery finished and the server selected a starting point — boot the
        // sandbox. SENDER-ONLY (the effect is only produced for the sender).
        case 'readyToBuild':
          ctx.props.onReadyToBuild?.()
          break
        // The agent asked the IDE to reload/navigate the preview, open a file, or
        // drive the preview bridge. Forward to the host (Workspace); not rendered
        // in the transcript.
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
    mount(): void {
      // React's region declares three refs; there is no mount I/O.
    },
  }
}
