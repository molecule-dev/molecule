/**
 * React's `chat:system-cards` region of ChatPanel.tsx (lines 1348–1471): the
 * inline system-card publisher and the push / reconcile registration.
 *
 * `systemCards` holds ONLY this session's local command cards (the `/help`,
 * `/settings`, `/scripts` browsers and command output): the server-driven
 * transcript notices are card-messages in the ONE transcript and render from
 * the timeline. The publisher auto-scrolls after the card renders unless the
 * user scrolled away, exactly as React does.
 *
 * `$effect`s are registered in the order ChatInner calls the slice's effect
 * entries, which is React's effect order.
 *
 * @module
 */

import type { ChatMessage, ChatStreamEvent } from '@molecule/app-ai-chat'
import { matchesSideChannelCommand, USER_ACCENT_STYLE } from '@molecule/app-ide-panel-logic'
import type { AddSystemCardOptions } from '@molecule/app-ide-panel-logic/panels'
import { COMMANDS } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:system-cards` slice. */
export interface ChatSystemCardsSlice {
  /** The latest committed transcript, read without a reactive dependency. */
  readonly readMessages: () => ChatMessage[]
  /** Adds one local system card to the timeline. */
  readonly addSystemCard: (text: string, options?: AddSystemCardOptions) => void
  /** Refuses a side-channel message the viewer cannot send; true when refused. */
  readonly blockDisabledTeamMessage: (message: string) => boolean

  /** React's mount I/O for the region: none — the region declares callbacks and effects. */
  mount(): void

  /** React's `#effect chat:system-cards:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void }
}

/**
 * Creates the `chat:system-cards` slice.
 *
 * @param ctx - The shared chat context (the transcript, the cards and the host registrars).
 * @returns The card publisher, the team-message gate and effects 1–3.
 */
export function createChatSystemCards(ctx: ChatContext): ChatSystemCardsSlice {
  /**
   * Reads the live transcript without subscribing to it, so a caller that reads
   * it never re-creates itself on each streaming chunk.
   *
   * @returns The transcript's messages.
   */
  const readMessages = (): ChatMessage[] => ctx.chat.messages

  /**
   * Publishes one local inline card, stamped with the client clock, then
   * scrolls the transcript to it unless the user scrolled away.
   *
   * @param text - The card's plain-text body.
   * @param opts - The variant's own fields, spread verbatim.
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
    mount(): void {
      // React's region registers three effects and declares two callbacks; there
      // is no additional mount I/O.
    },
    effects: {
      1: (): void => {
        // Register the pushed-event handler with the parent (Workspace) so it can
        // deliver broadcast chat events from other project members; re-register
        // when the host's callback identity changes, as React's effect deps do.
        $effect(() => {
          const register = ctx.props.onRegisterPushHandler
          if (!register) return
          register(applyPushedStreamEvent)
          return () => register(null)
        })
      },
      2: (): void => {
        // Register the history reconcile with the parent so it can converge this
        // panel on the persisted transcript whenever its push channel reconnects.
        $effect(() => {
          const register = ctx.props.onRegisterHistoryReconcile
          if (!register) return
          register(ctx.chat.reconcileHistory)
          return () => register(null)
        })
      },
      3: (): void => {
        // Inject the user-message accent-stripe styles once (the gradient
        // `::before` + its keyframe can't live inline). Guarded by id so it
        // injects a single time across the app. No reactive reads: runs once.
        $effect(() => {
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
