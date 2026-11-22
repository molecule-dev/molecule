/**
 * React's section “── 5XX backoff-retry countdown banner” (ChatPanel.tsx lines
 * 5735–5784): the mirror of the auto-fix banner for a server-error retry.
 *
 * The chat session surfaces `retryCountdown` only while a 5XX auto-retry is
 * pending (the error itself is held back until the retries are exhausted or
 * the user cancels), so this banner and the error message below it are never
 * shown at once. Its Cancel is the same button as the auto-fix strip's Cancel
 * directly above it.
 *
 * React renders the strip only while a retry is pending, so the host element —
 * React's own root `<div>` — carries the conformance unwrap marker and
 * `display: contents` while it is closed, and the port adds no node either
 * way. While pending the host IS the strip, with React's ClassMap classes,
 * `data-mol-id` and inline style.
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import type { ChatRetryCountdown } from '@molecule/app-ai-chat'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { Icon } from '../icon.component.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState } from './chat-inner-state.js'

/** React's inline style for the strip while it is shown. */
const ROOT_STYLE = styleText({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  fontSize: 12,
  background: 'rgba(234,179,8,0.06)',
})

/** The closed state: React renders nothing, so the host unwraps to nothing. */
const UNWRAP_STYLE = styleText({ display: 'contents' })

/** The warning icon's inline style. */
const ICON_STYLE = styleText({ flexShrink: 0, color: '#d4a017' })

/** The label's inline style. */
const LABEL_STYLE = styleText({ flex: 1, opacity: 0.85 })

/**
 * React's “── 5XX backoff-retry countdown banner” section: the retry strip, or
 * nothing while no retry is pending.
 */
@Component({
  selector: 'div[mol-chat-retry-banner]',
  standalone: true,
  imports: [Icon],
  host: {
    '[attr.data-parity-unwrap]': 'closed() ? "" : null',
    '[attr.class]': 'closed() ? null : rootClass',
    '[attr.data-mol-id]': 'closed() ? null : retryId',
    '[attr.style]': 'closed() ? unwrapStyle : rootStyle',
  },
  // prettier-ignore
  template: `@if (countdown(); as countdown) {<svg mol-icon [name]="'exclamation-triangle'" [size]="iconSize" aria-hidden="true" [attr.style]="iconStyle"></svg><span [attr.style]="labelStyle">{{ label(countdown) }}</span><button type="button" data-mol-id="chat-retry-cancel" (click)="cancel()" [attr.class]="cancelClass">{{ cancelText() }}</button>}`,
})
export class ChatRetryBanner {
  /** The shared state, read for the env (the ClassMap and the translator). */
  private readonly state = inject(ChatInnerState)

  /** The `chat:chat` slice: the pending retry countdown and its cancel action. */
  private readonly chat = inject(ChatChat)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The pending retry countdown, or `null` when none is waiting. */
  protected readonly countdown = this.chat.retryCountdown

  /** The strip's ClassMap classes while it is shown. */
  protected readonly rootClass: string

  /** The strip's inline style while it is shown. */
  protected readonly rootStyle: string | null = ROOT_STYLE

  /** The closed state's inline style (the host unwraps away). */
  protected readonly unwrapStyle: string | null = UNWRAP_STYLE

  /** The warning icon's inline style. */
  protected readonly iconStyle: string | null = ICON_STYLE

  /** The label's inline style. */
  protected readonly labelStyle: string | null = LABEL_STYLE

  /** The warning icon's size (React's `size={14}`). */
  protected readonly iconSize = 14

  /** React's `data-mol-id` for the pending strip. */
  protected readonly retryId = 'chat-retry-countdown'

  /** The Cancel button's ClassMap classes. */
  protected readonly cancelClass: string

  /** Resolves the ClassMap and the static classes once, at construction. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(this.cm.shrink0, this.cm.borderT)
    this.cancelClass = this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * Whether React would render nothing: no retry is pending.
   *
   * @returns Whether the strip is closed.
   */
  protected closed(): boolean {
    return this.countdown() === null
  }

  /**
   * The strip's label: the retry countdown with its attempt number.
   *
   * @param countdown - The pending retry countdown.
   * @returns The label text.
   */
  protected label(countdown: ChatRetryCountdown): string {
    // Follows a locale switch, the way React's whole-component re-render does.
    void this.state.env.locale()
    return this.state.env.t(
      'ide.chat.retryCountdown',
      { seconds: countdown.secondsRemaining, attempt: countdown.attempt },
      { defaultValue: 'Server error — retrying in {{seconds}}s… (attempt {{attempt}})' },
    )
  }

  /**
   * The Cancel button's label (the auto-fix strip's Cancel key, as in React).
   *
   * @returns The label text.
   */
  protected cancelText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })
  }

  /** Cancels the pending auto-retry. */
  protected cancel(): void {
    this.chat.cancelRetry()
  }
}
