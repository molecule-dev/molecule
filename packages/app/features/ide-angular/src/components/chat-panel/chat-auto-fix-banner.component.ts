/**
 * React's section “── Auto-fix countdown banner ──” (ChatPanel.tsx lines
 * 5661–5734): the strip above the composer shown while a verification
 * auto-fix is about to send.
 *
 * One strip: a warning icon, the countdown (or the paused label), and the
 * Resume-or-Pause and Cancel controls. This strip and the retry strip below it
 * share one button treatment, exactly as React renders them: Resume is the
 * affirmative action (primary), its sibling Pause is pause-like (warning), and
 * the Cancels are quiet dismissals (secondary).
 *
 * React renders the strip only while a countdown is armed, so the host element
 * — React's own root `<div>` with the strip's ClassMap classes and inline style
 * — is present then and out of the DOM while React renders nothing
 * (`useHostPresence`).
 *
 * @module
 */

import { Component, inject } from '@angular/core'

import { useHostPresence } from '@molecule/app-angular'
import type { AutoFixCountdown } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { Icon } from '../icon.component.js'
import { ChatAutoFix } from './chat-auto-fix.slice.js'
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

/** The warning icon's inline style. */
const ICON_STYLE = styleText({ flexShrink: 0, color: '#d4a017' })

/** The label's inline style. */
const LABEL_STYLE = styleText({ flex: 1, opacity: 0.85 })

/**
 * React's “── Auto-fix countdown banner ──” section: the countdown strip, or
 * nothing while no countdown is armed.
 */
@Component({
  selector: 'div[mol-chat-auto-fix-banner]',
  standalone: true,
  imports: [Icon],
  host: {
    '[attr.class]': 'rootClass',
    '[attr.style]': 'rootStyle',
  },
  // prettier-ignore
  template: `@if (countdown(); as countdown) {<svg mol-icon [name]="'exclamation-triangle'" [size]="iconSize" aria-hidden="true" [attr.style]="iconStyle"></svg><span [attr.style]="labelStyle">{{ label(countdown) }}</span>@if (countdown.paused) {<button type="button" data-mol-id="chat-autofix-resume" (click)="resume()" [attr.class]="resumeClass">{{ resumeText() }}</button>} @else {<button type="button" data-mol-id="chat-autofix-pause" (click)="pause()" [attr.class]="pauseClass">{{ pauseText() }}</button>}<button type="button" data-mol-id="chat-autofix-cancel" (click)="cancel()" [attr.class]="cancelClass">{{ cancelText() }}</button>}`,
})
export class ChatAutoFixBanner {
  /** The shared state, read for the env (the ClassMap and the translator). */
  private readonly state = inject(ChatInnerState)

  /** The `chat:auto-fix` slice: the armed countdown and its dispatcher. */
  private readonly autoFix = inject(ChatAutoFix)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm: UIClassMap

  /** The countdown the strip shows, or `null` when none is armed. */
  protected readonly countdown = this.autoFix.autoFixCountdown

  /** The strip's ClassMap classes while it is shown. */
  protected readonly rootClass: string

  /** The strip's inline style while it is shown. */
  protected readonly rootStyle: string | null = ROOT_STYLE

  /** The warning icon's inline style. */
  protected readonly iconStyle: string | null = ICON_STYLE

  /** The label's inline style. */
  protected readonly labelStyle: string | null = LABEL_STYLE

  /** The warning icon's size (React's `size={14}`). */
  protected readonly iconSize = 14

  /** The Resume button's ClassMap classes. */
  protected readonly resumeClass: string

  /** The Pause button's ClassMap classes. */
  protected readonly pauseClass: string

  /** The Cancel button's ClassMap classes. */
  protected readonly cancelClass: string

  /** Resolves the ClassMap and the static classes once, and keeps the host in the page only while shown. */
  constructor() {
    this.cm = this.state.env.cm
    this.rootClass = this.cm.cn(this.cm.shrink0, this.cm.borderT)
    this.resumeClass = this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
    this.pauseClass = this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'warning', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
    this.cancelClass = this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
    useHostPresence(() => !this.closed())
  }

  /**
   * Whether React would render nothing: no countdown is armed.
   *
   * @returns Whether the strip is closed.
   */
  protected closed(): boolean {
    return this.countdown() === null
  }

  /**
   * The strip's label: the paused copy, or the live countdown.
   *
   * @param countdown - The armed countdown.
   * @returns The label text.
   */
  protected label(countdown: AutoFixCountdown): string {
    // Follows a locale switch, the way React's whole-component re-render does.
    void this.state.env.locale()
    if (countdown.paused)
      return this.state.env.t('ide.chat.autoFixPaused', undefined, {
        defaultValue: 'Auto-fix paused',
      })
    return this.state.env.t(
      'ide.chat.autoFixCountdown',
      { seconds: countdown.secondsLeft },
      { defaultValue: 'Auto-fixing in {{seconds}}s...' },
    )
  }

  /**
   * The Resume button's label.
   *
   * @returns The label text.
   */
  protected resumeText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.autoFixResume', undefined, { defaultValue: 'Resume' })
  }

  /**
   * The Pause button's label.
   *
   * @returns The label text.
   */
  protected pauseText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.autoFixPause', undefined, { defaultValue: 'Pause' })
  }

  /**
   * The Cancel button's label (shared with the retry strip below).
   *
   * @returns The label text.
   */
  protected cancelText(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })
  }

  /** Resumes the countdown (restarting its three seconds). */
  protected resume(): void {
    this.autoFix.dispatchAutoFix({ type: 'resume' })
  }

  /** Pauses the countdown. */
  protected pause(): void {
    this.autoFix.dispatchAutoFix({ type: 'pause' })
  }

  /** Dismisses the countdown without sending. */
  protected cancel(): void {
    this.autoFix.dispatchAutoFix({ type: 'cancel' })
  }
}
