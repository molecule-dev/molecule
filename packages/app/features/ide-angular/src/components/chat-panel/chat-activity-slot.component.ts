/**
 * React's section “Persistent activity slot” (ChatPanel.tsx lines 5590–5660):
 * the ONE indicator for everything the agent does, kept mounted so it fades in
 * and out instead of reflowing the timeline.
 *
 * It is always in the layout (a reserved 28px even when idle) and toggled by
 * opacity, never mounted and unmounted, so it can never change the list height.
 * The label is the real current activity when it is known — the streaming
 * status, or the streaming message's tool/thinking activity — and otherwise the
 * sandbox-boot wait copy, exactly as React decides it.
 *
 * The host element IS React's slot `<div>` (its `data-mol-id`, `aria-hidden`
 * and inline geometry), so the port adds no node.
 *
 * @module
 */

import { Component, computed, inject } from '@angular/core'

import { streamingActivityLabel } from '@molecule/app-ide-panel-logic'
import { estimateTurnTokens } from '@molecule/app-ide-panel-logic/panels'

import { StreamingIndicator } from '../../parts/streaming-indicator.component.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatTimeline } from './chat-timeline.slice.js'

/** One element's inline style, in React's style-object shape. */
type StyleObject = Record<string, unknown>

/**
 * React's “Persistent activity slot” section: the always-mounted indicator.
 */
@Component({
  selector: 'div[mol-chat-activity-slot]',
  standalone: true,
  imports: [StreamingIndicator],
  host: {
    'data-mol-id': 'chat-activity-slot',
    '[attr.aria-hidden]': 'ariaHidden()',
    '[style]': 'slotStyle()',
  },
  // prettier-ignore
  template: `@if (showActivity()) {<div mol-streaming-indicator [label]="label()" [tokens]="streamingLike() ? turnTokens() : undefined" [startedAt]="streamingLike() ? turnStartedAt() : undefined"></div>}`,
})
export class ChatActivitySlot {
  /** The shared state, read for the props (the sandbox-boot wait). */
  private readonly state = inject(ChatInnerState)

  /** The chat session: the own-send and remote-turn flags and the status label. */
  private readonly chat = inject(ChatChat)

  /** The timeline slice: the streaming message among the visible ones. */
  private readonly timeline = inject(ChatTimeline)

  /**
   * Whether the slot shows activity: an own send, a remote turn or the
   * sandbox-boot wait.
   */
  protected readonly showActivity = computed(
    () =>
      this.chat.isLoading() ||
      !!this.state.props().awaitingSandboxBoot ||
      this.chat.isRemoteStreaming(),
  )

  /**
   * Whether a turn streams at all — an own send or a remote one. Only the
   * no-turn-at-all case (the boot wait alone) labels the slot as a boot wait.
   */
  protected readonly streamingLike = computed(
    () => this.chat.isLoading() || this.chat.isRemoteStreaming(),
  )

  /** The streaming message whose tool/thinking activity labels the slot. */
  private readonly streamingMessage = computed(() =>
    this.streamingLike()
      ? [...this.timeline.visibleMessages()].reverse().find((message) => message.isStreaming)
      : undefined,
  )

  /**
   * Turn start = the last genuine user message, so the elapsed timer counts up
   * across the WHOLE turn instead of resetting at each new assistant message.
   */
  protected readonly turnStartedAt = computed<number | undefined>(() => {
    const messages = this.chat.messages()
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.role === 'user' && !message.hidden) {
        return typeof message.timestamp === 'number' ? message.timestamp : undefined
      }
    }
    return undefined
  })

  /**
   * The turn's token count, summed across the same whole turn so it matches the
   * elapsed timer's span.
   */
  protected readonly turnTokens = computed(() => estimateTurnTokens(this.chat.messages()))

  /** The slot's label: the real activity, else the sandbox-boot wait copy. */
  protected readonly label = computed<string | undefined>(() => {
    if (!this.streamingLike()) {
      return this.state.env.t('ide.chat.awaitingSandbox', undefined, {
        defaultValue: 'Waiting for the development environment to finish starting…',
      })
    }
    const status = this.chat.streamingStatus()
    if (status) return status
    const message = this.streamingMessage()
    return message ? streamingActivityLabel(this.state.env.t, message) : undefined
  })

  /**
   * React's `aria-hidden`: stringified by the DOM, so the idle slot reads
   * "true" (and is skipped by assistive tech).
   *
   * @returns The attribute value.
   */
  protected ariaHidden(): string {
    return this.showActivity() ? 'false' : 'true'
  }

  /**
   * React's inline slot geometry: the reserved height and the opacity fade.
   *
   * @returns React's style object for the host element.
   */
  protected slotStyle(): StyleObject {
    const showActivity = this.showActivity()
    return {
      minHeight: '28px',
      opacity: showActivity ? '1' : '0',
      pointerEvents: showActivity ? 'auto' : 'none',
      transition: 'opacity 0.18s ease-out',
    }
  }
}
