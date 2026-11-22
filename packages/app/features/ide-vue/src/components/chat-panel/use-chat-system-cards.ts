/**
 * `chat:system-cards` — the inline system-card publisher and the push /
 * reconcile registration, ported from React's `chat:system-cards` region. Every
 * command, submit, test, git and skill path publishes through `addSystemCard`.
 *
 * `systemCards` holds ONLY this session's local command cards (the `/help`,
 * `/settings`, `/scripts` browsers and command output): the server-driven
 * transcript notices are card-messages in the ONE transcript and render from
 * the timeline. The publisher auto-scrolls after the card renders unless the
 * user scrolled away, exactly as React does.
 *
 * @module
 */

import { onMounted, onUnmounted, watch } from 'vue'

import type { ChatMessage, ChatStreamEvent } from '@molecule/app-ai-chat'
import { matchesSideChannelCommand, USER_ACCENT_STYLE } from '@molecule/app-ide-panel-logic'
import type { AddSystemCardOptions } from '@molecule/app-ide-panel-logic/panels'
import { COMMANDS } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect } from './context.js'

/** What the `chat:system-cards` slice exposes. */
export interface ChatSystemCardsSlice {
  /** Reads the live transcript (a stable callback, so a boundary never re-renders it). */
  readonly readMessages: () => ChatMessage[]
  /** Publishes a persistent inline card. */
  readonly addSystemCard: (text: string, options?: AddSystemCardOptions) => void
  /** Refuses a side-channel command when team messages are off; true when refused. */
  readonly blockDisabledTeamMessage: (message: string) => boolean
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:system-cards:1` — registers the pushed-event handler. */
    readonly 1: ChatEffect
    /** `#effect chat:system-cards:2` — registers the history reconcile. */
    readonly 2: ChatEffect
    /** `#effect chat:system-cards:3` — injects the user-accent styles once. */
    readonly 3: ChatEffect
  }
}

/**
 * Builds the `chat:system-cards` slice.
 *
 * @param ctx - The panel context (the transcript, the cards and the host registrars).
 * @returns The system-cards slice.
 */
export function createChatSystemCards(ctx: ChatCtx): ChatSystemCardsSlice {
  /**
   * Reads the live transcript without subscribing to it, so a caller that reads
   * it never re-creates itself on each streaming chunk.
   *
   * @returns The transcript's messages.
   */
  const readMessages = (): ChatMessage[] => ctx.chat.messages.value

  /**
   * Publishes one persistent inline card, stamped with the client clock, then
   * scrolls the transcript to it unless the user scrolled away.
   *
   * @param text - The card's plain-text body.
   * @param opts - The variant's own fields.
   */
  const addSystemCard = (text: string, opts: AddSystemCardOptions = {}): void => {
    // Stamped with the client clock, so the card lands where the user ran its
    // command. The variant's own fields are spread verbatim.
    const card = { id: crypto.randomUUID(), text, timestamp: Date.now(), ...opts }
    ctx.popups.setSystemCards((prev) => [...prev, card])
    // Auto-scroll after the card renders so the user sees it immediately.
    if (!ctx.scroll.userScrolledUpRef.current) {
      setTimeout(() => {
        const el = ctx.scroll.messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }

  /**
   * Refuses a side-channel command at the send boundary when team messages are
   * off, publishing the "unavailable" card. Removing a disabled command from the
   * menu must not reinterpret its raw text as an assistant send.
   *
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
   *
   * @param frameConversationId - The conversation the broadcast belongs to.
   * @param event - The pushed stream frame.
   */
  const applyPushedStreamEvent = (frameConversationId: string, event: ChatStreamEvent): void => {
    // Only apply broadcasts for the conversation this panel has open.
    if (frameConversationId !== ctx.env.conversationIdRef.current) return
    // Store ingestion first, so the transcript is current before any panel
    // side effect reads it.
    ctx.chat.applyRemoteEvent(event)
    // Flag the window so a pushed activity card is marked `received` (rendered, not
    // re-PUT) and sender-only side effects are skipped.
    ctx.stream.applyingPushedRef.current = true
    try {
      ctx.stream.handleStreamEvent(event)
    } finally {
      ctx.stream.applyingPushedRef.current = false
    }
    // A pushed event means a backend turn is live for this conversation.
    ctx.chat.noteRemoteStreamEvent()
  }

  /**
   * Registers a host callback now and discards the previous one, as React's
   * effect cleanup + re-run does when the callback identity changes.
   *
   * @param register - The host registrar.
   * @param handler - The handler to register, or `null` to clear it.
   */
  const swapRegistration = <T>(
    register: ((handler: T | null) => void) | undefined,
    handler: T,
  ): (() => void) => {
    register?.(handler)
    return () => register?.(null)
  }

  return {
    readMessages,
    addSystemCard,
    blockDisabledTeamMessage,
    effects: {
      1: () => {
        // Register the pushed-event handler with the parent (Workspace) so it can
        // deliver broadcast chat events from other project members.
        let unregister = (): void => {}
        const register = (): void => {
          unregister = swapRegistration(ctx.props.onRegisterPushHandler, applyPushedStreamEvent)
        }
        onMounted(register)
        onUnmounted(() => unregister())
        watch(
          () => ctx.props.onRegisterPushHandler,
          () => {
            unregister()
            register()
          },
          { flush: 'post' },
        )
      },
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
        onMounted(register)
        onUnmounted(() => unregister())
        watch(
          () => ctx.props.onRegisterHistoryReconcile,
          () => {
            unregister()
            register()
          },
          { flush: 'post' },
        )
      },
      3: () => {
        // Inject the user-message accent-stripe styles once (the gradient
        // `::before` + its keyframe can't live inline). Guarded by id so it
        // injects a single time across the app.
        onMounted(() => {
          const id = 'mol-chat-user-accent-style'
          if (typeof document === 'undefined' || document.getElementById(id)) return
          const el = document.createElement('style')
          el.id = id
          el.textContent = USER_ACCENT_STYLE
          document.head.appendChild(el)
        })
      },
    },
  }
}
