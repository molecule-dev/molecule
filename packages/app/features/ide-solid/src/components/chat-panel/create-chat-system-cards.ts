/**
 * `chat:system-cards` — the session-local system cards, the broadcast-event
 * handler and the disabled-team-message gate (React's `chat:system-cards`
 * region, ported by unit P5).
 *
 * `systemCards` holds ONLY this session's local command cards (the `/help`,
 * `/settings`, `/scripts` browsers and command output): the server-driven
 * transcript notices are card-messages in the ONE transcript and render from
 * the timeline. The publisher auto-scrolls after the card renders unless the
 * user scrolled away, exactly as React does.
 *
 * @module
 */

import { createEffect, on, onCleanup, onMount, untrack } from 'solid-js'

import type { ChatMessage, ChatStreamEvent } from '@molecule/app-ai-chat'
import { matchesSideChannelCommand, USER_ACCENT_STYLE } from '@molecule/app-ide-panel-logic'
import type { AddSystemCardOptions } from '@molecule/app-ide-panel-logic/panels'
import { COMMANDS } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:system-cards`. */
export interface ChatSystemCardsSlice {
  /** The latest committed transcript, read without a reactive dependency. */
  readMessages: () => ChatMessage[]
  /** Adds one local system card to the timeline. */
  addSystemCard: (text: string, options?: AddSystemCardOptions) => void
  /** Refuses a side-channel message the viewer cannot send; true when refused. */
  blockDisabledTeamMessage: (message: string) => boolean
  /** Applies a teammate's broadcast frame to the store and the panel. */
  applyPushedStreamEvent: (conversationId: string, event: ChatStreamEvent) => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Registers a host callback now and discards the previous one, as React's
 * effect cleanup plus re-run does when the callback identity changes.
 * @param register - The host registrar.
 * @param handler - The handler to register, or `null` to clear it.
 * @returns The unregister function.
 */
function swapRegistration<T>(
  register: ((handler: T | null) => void) | undefined,
  handler: T,
): () => void {
  register?.(handler)
  return () => register?.(null)
}

/**
 * Creates `chat:system-cards`.
 * @param ctx - The inner ctx (the transcript, the popups that hold the cards and
 *   the host registrars).
 * @returns The system-cards slice.
 */
export function createChatSystemCards(ctx: ChatInnerCtx): ChatSystemCardsSlice {
  /**
   * Reads the live transcript without subscribing to it, so a caller that reads
   * it never re-creates itself on each streaming chunk.
   * @returns The transcript's messages.
   */
  const readMessages = (): ChatMessage[] => untrack(() => ctx.chat.messages())

  /**
   * Publishes one persistent inline card, stamped with the client clock, then
   * scrolls the transcript to it unless the user scrolled away.
   * @param text - The card's plain-text body.
   * @param opts - The variant's own fields.
   */
  const addSystemCard = (text: string, opts: AddSystemCardOptions = {}): void => {
    // Stamped with the client clock, so the card lands where the user ran its
    // command. The variant's own fields are spread verbatim.
    const card = { id: crypto.randomUUID(), text, timestamp: Date.now(), ...opts }
    ctx.popups.setSystemCards((previous) => [...previous, card])
    // Auto-scroll after the card renders so the user sees it immediately.
    if (!ctx.scroll.userScrolledUpRef.current) {
      setTimeout(() => {
        const element = ctx.scroll.messagesContainerRef.current
        if (element) element.scrollTop = element.scrollHeight
      }, 50)
    }
  }

  /**
   * Refuses a side-channel command at the send boundary when team messages are
   * off, publishing the "unavailable" card. Removing a disabled command from the
   * menu must not reinterpret its raw text as an assistant send.
   * @param message - The raw outgoing message text.
   * @returns True when the send was refused.
   */
  const blockDisabledTeamMessage = (message: string): boolean => {
    if (
      ctx.props.canSendTeamMessages !== false ||
      !matchesSideChannelCommand(
        ctx.props.extraCommands?.length ? [...COMMANDS, ...ctx.props.extraCommands] : COMMANDS,
        message,
      )
    )
      return false
    addSystemCard(
      ctx.env.t('ide.chat.teamMessagesUnavailable', undefined, {
        defaultValue: 'Team messaging is unavailable in this workspace.',
      }),
    )
    return true
  }

  /**
   * Applies a chat event broadcast by another project member: ingests it into
   * the message store first, then runs the panel-level handler with the
   * applying-pushed flag set for exactly this event.
   * @param frameConversationId - The conversation the broadcast belongs to.
   * @param event - The pushed stream frame.
   */
  const applyPushedStreamEvent = (frameConversationId: string, event: ChatStreamEvent): void => {
    // Only apply broadcasts for the conversation this panel has open.
    if (frameConversationId !== ctx.env.conversationIdRef.current) return
    // Store ingestion first, so the transcript is current before any panel side
    // effect reads it.
    ctx.chat.applyRemoteEvent(event)
    // Flag the window so a pushed activity card is marked `received` (rendered,
    // not re-PUT) and sender-only side effects are skipped.
    ctx.stream.applyingPushedRef.current = true
    try {
      ctx.stream.handleStreamEvent(event)
    } finally {
      ctx.stream.applyingPushedRef.current = false
    }
    // A pushed event means a backend turn is live for this conversation.
    ctx.chat.noteRemoteStreamEvent()
  }

  return {
    readMessages,
    addSystemCard,
    blockDisabledTeamMessage,
    applyPushedStreamEvent,
    effects: {
      // #effect chat:system-cards:1 — register the pushed-event handler.
      1: () => {
        // Register the pushed-event handler with the parent (Workspace) so it can
        // deliver broadcast chat events from other project members; deregister on
        // unmount, and re-register when the host swaps its registrar.
        let unregister = (): void => {}
        const register = (): void => {
          unregister = swapRegistration(ctx.props.onRegisterPushHandler, applyPushedStreamEvent)
        }
        onMount(register)
        onCleanup(() => unregister())
        createEffect(
          on(
            () => ctx.props.onRegisterPushHandler,
            () => {
              unregister()
              register()
            },
            { defer: true },
          ),
        )
      },

      // #effect chat:system-cards:2 — register the history reconcile.
      2: () => {
        // Register the history reconcile with the parent so it can converge this
        // panel on the persisted transcript whenever its push channel reconnects.
        let unregister = (): void => {}
        const register = (): void => {
          unregister = swapRegistration(
            ctx.props.onRegisterHistoryReconcile,
            ctx.chat.reconcileHistory,
          )
        }
        onMount(register)
        onCleanup(() => unregister())
        createEffect(
          on(
            () => ctx.props.onRegisterHistoryReconcile,
            () => {
              unregister()
              register()
            },
            { defer: true },
          ),
        )
      },

      // #effect chat:system-cards:3 — inject the user-accent styles once.
      3: () => {
        // The gradient `::before` + its keyframe can't live inline; gated on the
        // row's data-mol-id, so no other row is touched. Guarded by id so it
        // injects a single time across the app.
        onMount(() => {
          const id = 'mol-chat-user-accent-style'
          if (typeof document === 'undefined' || document.getElementById(id)) return
          const element = document.createElement('style')
          element.id = id
          element.textContent = USER_ACCENT_STYLE
          document.head.appendChild(element)
        })
      },
    },
  }
}
