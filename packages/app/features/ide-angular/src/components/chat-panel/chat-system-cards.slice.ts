/**
 * React's `chat:system-cards` region of ChatPanel.tsx (lines 1348–1471): the
 * session-local inline card publisher, the side-channel message gate, the
 * pushed-event handler the host registers, and the three effects that register
 * those handlers and inject the user-message accent styles.
 *
 * The persisted, server-driven notices are card-messages in the ONE transcript
 * and render from the timeline; this region's `systemCards` holds ONLY the
 * local command cards (`/help`, `/settings`, `/scripts`, command output) —
 * transient chrome that is never persisted or broadcast.
 *
 * @module
 */

import { DestroyRef, inject, Injectable, Injector } from '@angular/core'

import type { ChatMessage, ChatStreamEvent } from '@molecule/app-ai-chat'
import { matchesSideChannelCommand, USER_ACCENT_STYLE } from '@molecule/app-ide-panel-logic'
import type { AddSystemCardOptions, SystemCard } from '@molecule/app-ide-panel-logic/panels'
import { COMMANDS } from '@molecule/app-ide-panel-logic/panels'

import { ChatChat } from './chat-chat.slice.js'
import type { ChatInnerProps } from './chat-inner-state.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatScroll } from './chat-scroll.slice.js'
import { ChatStream } from './chat-stream.slice.js'

/** The identifiers other slices and sections read from the `chat:system-cards` slice. */
export interface ChatSystemCardsSlice {
  /** React's mount I/O for the region: the three effects' initial runs. */
  mount(): void

  /** React's `#effect chat:system-cards:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void }

  /** Reads the live transcript (a stable callback, so a boundary never re-renders it). */
  readonly readMessages: () => ChatMessage[]
  /** Publishes a persistent inline card. */
  readonly addSystemCard: (text: string, options?: AddSystemCardOptions) => void
  /** Refuses a side-channel command when team messages are off; true when refused. */
  readonly blockDisabledTeamMessage: (message: string) => boolean
  /** Applies one chat event broadcast by another project member. */
  readonly applyPushedStreamEvent: (frameConversationId: string, event: ChatStreamEvent) => void
}

/**
 * React's `chat:system-cards` slice: the local card publisher and the host
 * handler registrations.
 */
@Injectable()
export class ChatSystemCards implements ChatSystemCardsSlice {
  /** The shared state, read for the props (the host callbacks and the gates). */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** Clears the registered host handlers when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The push handler currently registered with the host, or null. */
  private pushHandler: ChatInnerProps['onRegisterPushHandler'] | null = null

  /** The reconcile currently registered with the host, or null. */
  private reconcileHandler: ChatInnerProps['onRegisterHistoryReconcile'] | null = null

  /** React's region cleanup: drop both host registrations on unmount. */
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.pushHandler?.(null)
      this.pushHandler = null
      this.reconcileHandler?.(null)
      this.reconcileHandler = null
    })
  }

  /**
   * Reads the live transcript without subscribing to it, so a caller that reads
   * it never re-creates itself on each streaming chunk.
   *
   * @returns The transcript's messages.
   */
  readonly readMessages = (): ChatMessage[] => this.state.slice(ChatChat).messages()

  /**
   * Publishes one local inline card, stamped with the client clock, then
   * scrolls the transcript to it unless the user scrolled away.
   *
   * @param text - The card's plain-text body.
   * @param options - The variant's own fields, spread verbatim.
   */
  readonly addSystemCard = (text: string, options: AddSystemCardOptions = {}): void => {
    // Stamped with the client clock, so the card lands where the user ran its
    // command. The variant's own fields are spread verbatim.
    const card: SystemCard = { id: crypto.randomUUID(), text, timestamp: Date.now(), ...options }
    this.state.slice(ChatPopups).setSystemCards((prev) => [...prev, card])
    // Auto-scroll after the card renders so the user sees it immediately.
    if (!this.state.slice(ChatScroll).userScrolledUpRef.current) {
      setTimeout(() => {
        const el = this.state.slice(ChatScroll).messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }

  /**
   * Refuses a side-channel command at the send boundary when team messages are
   * off, publishing the "unavailable" card. Removing a disabled command from
   * the menu must not reinterpret its raw text as an assistant send.
   *
   * @param message - The raw outgoing message text.
   * @returns True when the send was refused.
   */
  readonly blockDisabledTeamMessage = (message: string): boolean => {
    const props = this.state.props()
    if (
      props.canSendTeamMessages !== false ||
      !matchesSideChannelCommand(
        props.extraCommands?.length ? [...COMMANDS, ...props.extraCommands] : COMMANDS,
        message,
      )
    )
      return false
    this.addSystemCard(
      this.state.env.t('ide.chat.teamMessagesUnavailable', undefined, {
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
  readonly applyPushedStreamEvent = (frameConversationId: string, event: ChatStreamEvent): void => {
    // Only apply broadcasts for the conversation this panel has open.
    if (frameConversationId !== this.state.env.conversationIdRef.current) return
    // Store ingestion first, so the transcript is current before any panel
    // side effect reads it.
    this.state.slice(ChatChat).applyRemoteEvent(event)
    // Flag the window so a pushed activity card is marked `received` (rendered,
    // not re-PUT) and sender-only side effects are skipped.
    const stream = this.state.slice(ChatStream)
    stream.applyingPushedRef.current = true
    try {
      stream.handleStreamEvent(event)
    } finally {
      stream.applyingPushedRef.current = false
    }
    this.state.slice(ChatChat).noteRemoteStreamEvent()
  }

  /**
   * Registers the pushed-event handler with the host, re-registering only when
   * the host's callback identity changes (React's effect dependencies).
   *
   * @param register - The host's registrar, or undefined for none.
   */
  private wirePushHandler(register: ChatInnerProps['onRegisterPushHandler']): void {
    const next = register ?? null
    if (this.pushHandler === next) return
    // React's cleanup clears the callback it registered, then the new run sets it.
    this.pushHandler?.(null)
    this.pushHandler = next
    next?.(this.applyPushedStreamEvent)
  }

  /**
   * Registers the history reconcile with the host, re-registering only when the
   * host's callback identity changes (React's effect dependencies).
   *
   * @param register - The host's registrar, or undefined for none.
   */
  private wireReconcileHandler(register: ChatInnerProps['onRegisterHistoryReconcile']): void {
    const next = register ?? null
    if (this.reconcileHandler === next) return
    // React's cleanup clears the callback it registered, then the new run sets it.
    this.reconcileHandler?.(null)
    this.reconcileHandler = next
    next?.(this.state.slice(ChatChat).reconcileHistory)
  }

  /**
   * Injects the user-message accent-stripe styles once. The gradient `::before`
   * and its keyframe cannot live inline; the id guard makes it inject a single
   * time across the app.
   */
  private injectAccentStyle(): void {
    const id = 'mol-chat-user-accent-style'
    if (typeof document === 'undefined' || document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = USER_ACCENT_STYLE
    document.head.appendChild(el)
  }

  /** React's mount I/O for the region: each effect's first run registers at its own position. */
  mount(): void {
    // The registrations are effects 1-3's first runs, at their ledger positions
    // (the push handler lands right after the history load, before the
    // conversation's activity cards are read).
  }

  /** React's `#effect chat:system-cards:<n>` ledger, registered at its positions. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        this.wirePushHandler(this.state.props().onRegisterPushHandler)
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        this.wireReconcileHandler(this.state.props().onRegisterHistoryReconcile)
      })
    },
    3: (): void => {
      registerChatEffect(this.injector, () => {
        // No reactive reads: like React's `[]` deps, this runs once.
        this.injectAccentStyle()
      })
    },
  }
}
